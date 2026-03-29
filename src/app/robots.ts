import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://paperforge.dev';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/editor/', '/admin/', '/projects/', '/settings/', '/login', '/register', '/forgot-password', '/reset-password', '/share/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
