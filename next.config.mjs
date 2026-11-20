// As páginas são servidas pelo Next.js; a API (Express, em api/) corre no mesmo servidor (server.mjs)
// e envia os seus próprios cabeçalhos de segurança (helmet).
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), geolocation=(self), microphone=()' },
      ],
    }];
  },
};

export default nextConfig;
