module.exports = {
    plugins: ["prettier"],
    rules: {
      "prettier/prettier": "error"
    },
    extends: ["plugin:prettier/recommended"],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module'
      },
      env: {
        node: true
      }
  }