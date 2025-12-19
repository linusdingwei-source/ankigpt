import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const localeTitles: Record<string, string> = {
    zh: '定价套餐 - 选择适合您的Credits套餐',
    en: 'Pricing Plans - Choose Your Credits Package',
    ja: '料金プラン - あなたに合ったクレジットプランを選択',
  };

  const localeDescriptions: Record<string, string> = {
    zh: '选择适合的Credits套餐。Starter套餐$5获得7 Credits，Pro套餐$20获得30 Credits，Premium套餐$100获得150 Credits。所有套餐包含额外赠送。',
    en: 'Choose a credits package that fits your needs. Starter $5 gets 7 credits, Pro $20 gets 30 credits, Premium $100 gets 150 credits. All packages include bonus credits.',
    ja: 'あなたのニーズに合ったクレジットプランを選択してください。Starter $5で7クレジット、Pro $20で30クレジット、Premium $100で150クレジットを獲得できます。すべてのプランにはボーナスクレジットが含まれています。',
  };

  return generateSEOMetadata({
    title: localeTitles[locale] || localeTitles.zh,
    description: localeDescriptions[locale] || localeDescriptions.zh,
    keywords: ['定价', '套餐', 'Credits', 'pricing', 'plans', '料金'],
    locale,
    path: `/${locale}/pricing`,
  });
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

