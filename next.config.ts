/** @type {import('next').NextConfig} */
const nextConfig = {
  /* 
     NOTE: 'eslint' and 'typescript' ignore settings are no longer 
     supported in the config file for Next.js 15+. 
     The build will now use your project's root linting/TS settings.
  */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;