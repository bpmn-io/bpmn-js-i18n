import fs from "node:fs";

const translationPaths = fs.readdirSync("./dist/translations");

const translationsUrl =
  "https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/docs/translations.json";

type ResultType = {
  keys: string;
  translations: Record<string, StatsType>;
};

type StatsType = {
  ok: string[];
  missing: string[];
  unknown: string[];
};

async function run() {
  const errors = [] as any[];

  console.log("INFO: Fetching translation keys");

  const translationsKeys = await fetch(translationsUrl).then((response) =>
    response.text()
  );

  const results: ResultType = {
    keys: translationsKeys,
    translations: {},
  };

  const translationsEnglish: Record<string, string> = (
    JSON.parse(translationsKeys) as string[]
  ).reduce((previousValue, key) => {
    return {
      ...previousValue,
      [key]: key,
    };
  }, {});

  if (process.env.UPDATE_TRANSLATIONS) {
    writeTranslation("en.js", translationsEnglish);
  }

  console.log("INFO: Verifying translations");

  for (const translationPath of translationPaths) {
    const name = translationPath.split(".")[0].toUpperCase();

    console.log(`INFO: Verifying ${name} translations`);

    try {
      const { default: translations } = await import(
        `../dist/translations/${translationPath}`
      );

      const translationsOrdered = Object.keys(translations)
        .sort((a, b) => (a === b ? 0 : a < b ? -1 : 1))
        .reduce((previousValue, key) => {
          previousValue[key] = translations[key];

          return previousValue;
        }, {} as Record<string, string>);

      if (process.env.UPDATE_TRANSLATIONS) {
        writeTranslation(translationPath, translationsOrdered);
      }

      const stats: StatsType = {
        ok: [],
        missing: [],
        unknown: [],
      };

      for (const key in translationsEnglish) {
        if (key in translationsOrdered) {
          stats.ok.push(key);
        } else {
          stats.missing.push(key);
        }
      }

      for (const key in translationsOrdered) {
        if (!(key in translationsEnglish)) {
          stats.unknown.push(key);
        }
      }

      if (stats.missing.length) {
        console.warn(
          "WARN: %s has %s missing translations: %o",
          name,
          stats.missing.length,
          stats.missing
        );
      }

      if (stats.unknown.length) {
        console.warn(
          "WARN: %s has %s unknown translations: %o",
          name,
          stats.unknown.length,
          stats.unknown
        );
      }

      results.translations[name] = stats;
    } catch (error) {
      console.error(`ERR: <${name}> could not be validated`, error);

      errors.push(error);
    }
  }

  if (!errors.length) {
    writeResults(results);
  }

  return errors;
}

run().then((errors) => {
  if (errors.length) {
    process.exit(1);
  }
});

// helpers //////////////

function writeTranslation(file: string, messages: Record<string, string>) {
  fs.writeFileSync(
    `translations/${file}`,
    `export default ${JSON.stringify(messages, null, 2)};`,
    "utf8"
  );
}

function writeResults(results: ResultType) {
  const status = (stats: StatsType) => {
    return [
      [0, "🟢"] as const,
      [10, "🟡"] as const,
      [results.keys.length, "🔴"] as const,
    ].find((e) => e[0] >= stats.missing.length)?.[1];
  };

  const body = Object.entries(results.translations)
    .map(([name, stats]) => {
      const language = name.toLowerCase();

      return `|[${language}](../translations/${language}.js)|${status(stats)}|${
        stats.missing.length
      }|${stats.unknown.length}|`;
    })
    .join("\n");

  const markdown = `# Translation Coverage

A coverage report for existing translations, updated regularily against the latest [bpmn-js release](https://github.com/bpmn-io/bpmn-js).

| Language | Status | Missing keys | Unknown keys |
| :--- | :---: | ---: | ---: |
${body}

_Missing keys_ indicate entries without translation, _unknown keys_ refer to entries that are no longer valid.
`;

  fs.mkdirSync("docs", { recursive: true });

  fs.writeFileSync(`docs/COVERAGE.md`, markdown, "utf8");
  fs.writeFileSync(`docs/coverage.json`, JSON.stringify(results, null, 2), "utf8");
}
