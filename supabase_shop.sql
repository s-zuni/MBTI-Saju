-- 1. shop_products (상품 정보) 테이블
CREATE TABLE IF NOT EXISTS public.shop_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- KRW 단위 (원화)
    stock INTEGER NOT NULL DEFAULT 0,
    product_type TEXT NOT NULL DEFAULT 'physical' CHECK (product_type IN ('physical', 'digital')),
    thumbnail_url TEXT,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. shop_cart (장바구니) 테이블
CREATE TABLE IF NOT EXISTS public.shop_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 3. shop_wishlist (좋아요/위시리스트) 테이블
CREATE TABLE IF NOT EXISTS public.shop_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 4. shop_orders (주문 정보) 테이블
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    payment_key TEXT,
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    shipping_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. shop_order_items (주문 상세 항목) 테이블
CREATE TABLE IF NOT EXISTS public.shop_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
);

-- 인덱스 설정
CREATE INDEX IF NOT EXISTS idx_shop_cart_user ON public.shop_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_wishlist_user ON public.shop_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON public.shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_number ON public.shop_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON public.shop_order_items(order_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- shop_products: 비인증 유저 포함 모두 조회 가능, 관리는 admin만 가능
CREATE POLICY "Allow public select shop_products" ON public.shop_products
    FOR SELECT USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Allow admin insert/update/delete shop_products" ON public.shop_products
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- shop_cart: 자신의 것만 관리 가능
CREATE POLICY "Allow user all shop_cart" ON public.shop_cart
    FOR ALL USING (auth.uid() = user_id);

-- shop_wishlist: 자신의 것만 관리 가능
CREATE POLICY "Allow user all shop_wishlist" ON public.shop_wishlist
    FOR ALL USING (auth.uid() = user_id);

-- shop_orders: 자신의 것만 조회 가능, 인증 유저는 생성(주문) 가능, admin은 전체 관리 가능
CREATE POLICY "Allow user select own shop_orders" ON public.shop_orders
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Allow user insert own shop_orders" ON public.shop_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admin update shop_orders" ON public.shop_orders
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- shop_order_items: 자신의 주문 아이템만 조회 가능, admin은 전체 조회/관리 가능
CREATE POLICY "Allow user select own shop_order_items" ON public.shop_order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shop_orders WHERE id = order_id AND user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Allow user/admin insert shop_order_items" ON public.shop_order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_orders WHERE id = order_id AND user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Storage Bucket 생성 및 정책 설정 (SQL Editor에서 실행 가능한 형태)
-- Note: 'shop-images' 버킷은 이미 생성되었거나, Supabase 콘솔에서 직접 만들 수 있으나 SQL로 삽입 시도
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책 설정
CREATE POLICY "Allow public read shop-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'shop-images');

CREATE POLICY "Allow admin manage shop-images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'shop-images' AND EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 트랜잭션 처리를 위한 RPC 함수 (process_shop_order)
CREATE OR REPLACE FUNCTION public.process_shop_order(
    p_user_id UUID,
    p_order_number TEXT,
    p_total_amount INTEGER,
    p_payment_key TEXT,
    p_shipping_name TEXT,
    p_shipping_phone TEXT,
    p_shipping_address TEXT,
    p_shipping_memo TEXT,
    p_items JSONB -- [{product_id, product_name, product_price, quantity, subtotal}] 형태의 배열
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_stock INTEGER;
BEGIN
    -- 1. 주문 생성 (결제 완료 상태로 생성)
    INSERT INTO public.shop_orders (
        user_id, order_number, total_amount, status, payment_key,
        shipping_name, shipping_phone, shipping_address, shipping_memo
    ) VALUES (
        p_user_id, p_order_number, p_total_amount, 'paid', p_payment_key,
        p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_memo
    ) RETURNING id INTO v_order_id;

    -- 2. 주문 상세 항목 삽입 및 재고 차감 루프
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        -- 주문 상세 정보 삽입
        INSERT INTO public.shop_order_items (
            order_id, product_id, product_name, product_price, quantity, subtotal
        ) VALUES (
            v_order_id,
            v_product_id,
            v_item->>'product_name',
            (v_item->>'product_price')::INTEGER,
            v_quantity,
            (v_item->>'subtotal')::INTEGER
        );

        -- 재고 차감 (동시성 제어를 위해 stock >= quantity 확인 후 atomic update)
        UPDATE public.shop_products
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id AND stock >= v_quantity;

        -- 만약 재고 부족으로 업데이트된 행이 없다면 예외 발생 (트랜잭션 롤백됨)
        IF NOT FOUND THEN
            RAISE EXCEPTION '재고가 부족합니다. (상품 ID: %)', v_product_id;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
