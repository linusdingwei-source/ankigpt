export interface FAQItem {
  question: string;
  answer: string;
}

export interface Organization {
  name: string;
  url: string;
  logo?: string;
}

export function generateFAQStructuredData(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateOrganizationStructuredData(org: Organization) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    ...(org.logo && {
      logo: {
        '@type': 'ImageObject',
        url: org.logo,
      },
    }),
  };
}

export function generateWebSiteStructuredData(siteUrl: string, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateServiceStructuredData(serviceName: string, description: string, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description,
    provider: {
      '@type': 'Organization',
      name: '日语文本转语音',
      url: siteUrl,
    },
    areaServed: {
      '@type': 'Country',
      name: ['CN', 'JP', 'US'],
    },
  };
}

