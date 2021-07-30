import fs from 'fs';

import path from 'path';

const translations = fs.readdirSync('translations');

async function run() {

  const errors = [];

  console.log('Checking translations');

  for (const translation of translations) {

    try {
      await import(`../translations/${translation}`);

      console.log(`OK: ${translation}`);
    } catch (error) {
      console.error(`ERR: <${translation}> Failed to load.`, error);
      errors.push(error);
    }
  }

  return errors;
}

run().then(errors => {
  if (errors.length) {
    process.exit(1);
  }
});