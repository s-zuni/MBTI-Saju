const fs = require('fs');

function replaceExact(file, search, replace) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  } else {
    // If not exact match, let's try a regex for the import line just in case spaces differ
    console.log('Not found in', file, ':', search);
  }
}

// 1
replaceExact('src/components/CreditPurchaseModal.tsx', "import { X, Coins Sparkles, Check, Zap, Loader2 } from 'lucide-react';", "import { X, Coins, Sparkles, Check, Zap, Loader2 } from 'lucide-react';");
// 2
replaceExact('src/components/CreditPurchaseModal.tsx', "currentCredits = 0", "currentCredits = 0,");
// 3
replaceExact('src/components/FortuneModal.tsx', "import { Coins Lock } from 'lucide-react';", "import { Coins, Lock } from 'lucide-react';");
// 4
replaceExact('src/components/MyPage.tsx', "import { Users, Sparkles, Coins Loader2, AlertCircle, Key, FileText } from 'lucide-react';", "import { Users, Sparkles, Coins, Loader2, AlertCircle, Key, FileText } from 'lucide-react';");
// 5
replaceExact('src/components/MyPage.tsx', "const { credits: credits, purchaseCoins = useCredits(session);", "const { credits, purchaseCredits } = useCredits(session);");
// 6
replaceExact('src/components/PremiumBanner.tsx', "import { Coins X } from 'lucide-react';", "import { Coins, X } from 'lucide-react';");
// 7, 8, 9, 10
replaceExact('src/pages/admin/AdminInquiries.tsx', "    Coins\r\n    User,", "    Coins,\r\n    User,");
replaceExact('src/pages/admin/AdminInquiries.tsx', "    Coins\n    User,", "    Coins,\n    User,");
replaceExact('src/pages/admin/AdminInquiries.tsx', "const [rewardCoins setRewardCredits] = useState(0);", "const [rewardCredits, setRewardCredits] = useState(0);");
replaceExact('src/pages/admin/AdminInquiries.tsx', "answered_at: new Date().toISOString()", "answered_at: new Date().toISOString(),");
replaceExact('src/pages/admin/AdminInquiries.tsx', ".update({ credits: (profile.credits || 0) + rewardCoins)", ".update({ credits: (profile.credits || 0) + rewardCredits })");
// 11
replaceExact('src/pages/admin/PlanManagement.tsx', "    Coins\r\n    CreditCard", "    Coins,\r\n    CreditCard");
replaceExact('src/pages/admin/PlanManagement.tsx', "    Coins\n    CreditCard", "    Coins,\n    CreditCard");
// 12, 13
replaceExact('src/pages/ChatPage.tsx', "import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, Coins AlertCircle } from 'lucide-react';", "import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, Coins, AlertCircle } from 'lucide-react';");
replaceExact('src/pages/ChatPage.tsx', "const { credits: credits, useCredits: consumeCoins purchaseCoins = useCredits(session);", "const { credits, useCredits: consumeCredits, purchaseCredits } = useCredits(session);");
// 14
replaceExact('src/pages/PricingPage.tsx', "import { Coins Sparkles, Check, Loader2, Zap, AlertCircle } from 'lucide-react';", "import { Coins, Sparkles, Check, Loader2, Zap, AlertCircle } from 'lucide-react';");
