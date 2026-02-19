module.exports = {
  presets: [
    ['@babel/preset-env', { "targets": { "node": "current" } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-object-rest-spread'
  ]
};
