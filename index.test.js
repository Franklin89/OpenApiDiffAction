const process = require('process');
const cp = require('child_process');
const path = require('path');

test('single file', () => {
  process.env['INPUT_BASEFILE'] = './testdata/base/pets-same.json';
  process.env['INPUT_HEADFILE'] = './testdata/head/pets-same.json';
  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node ${ip}`, { env: process.env }).toString();
  console.log(result);
})

test('wildcard', () => {
  process.env['INPUT_BASEFILE'] = './testdata/base/*.json';
  process.env['INPUT_HEADFILE'] = './testdata/head/*.json';
  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node ${ip}`, { env: process.env }).toString();
  console.log(result);
})
