/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `three` ships untranspiled ESM; let Next handle it.
  transpilePackages: ["three"],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { webpack }) => {
    // @solana/web3.js and friends expect a few Node globals in the browser.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    config.plugins.push(
      new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
    );
    return config;
  },
};

export default nextConfig;
