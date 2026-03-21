module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ],
    "@babel/preset-typescript",
    [
      "@babel/preset-react",
      {
        "runtime": "automatic"
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-proposal-decorators",
      {
        "legacy": true
      }
    ],
    [
      "@babel/plugin-transform-class-properties",
      {
        "loose": true
      }
    ],
    [
      "@babel/plugin-transform-private-methods",
      {
        "loose": true
      }
    ],
    "@babel/plugin-transform-object-rest-spread"
  ]
};