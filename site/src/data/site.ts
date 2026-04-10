export const SITE_URL = import.meta.env.SITE + import.meta.env.BASE_URL;
export const SITE_ORIGIN = import.meta.env.SITE as string;

export const SITE_NAME = 'Awesome Prometheus Alerts';

/** ISO date the project was first published — used as datePublished across all schemas */
export const SITE_DATE_PUBLISHED = '2018-10-21';

// Author
export const AUTHOR_NAME = 'Samuel Berthe';
export const AUTHOR_GITHUB_URL = 'https://github.com/samber';
export const TWITTER_HANDLE = '@samuelberthe';

// GitHub
export const GITHUB_URL = 'https://github.com/samber/awesome-prometheus-alerts';
export const GITHUB_API_REPO_URL = 'https://api.github.com/repos/samber/awesome-prometheus-alerts';
export const GITHUB_CONTRIBUTING_URL = `${GITHUB_URL}/blob/master/CONTRIBUTING.md`;
export const GITHUB_LICENSE_URL = `${GITHUB_URL}/blob/master/LICENSE`;

// Licenses
export const LICENSE_CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const LICENSE_CC_BY_NAME = 'Creative Commons CC BY 4.0';
export const LICENSE_MIT_URL = 'https://opensource.org/licenses/MIT';
export const LICENSE_MIT_NAME = 'MIT';
export const GITHUB_MIT_LICENSE_URL = `${GITHUB_URL}/blob/master/site/LICENSE`;

export const schemaAuthor = {
  '@type': 'Person',
  name: AUTHOR_NAME,
  url: AUTHOR_GITHUB_URL,
  sameAs: [
    AUTHOR_GITHUB_URL,
    `https://twitter.com/${TWITTER_HANDLE.slice(1)}`,
  ],
};

export const schemaPublisher = {
  '@type': 'Organization',
  name: 'Prometheus Alerts authors',
  url: GITHUB_URL,
  sameAs: [GITHUB_URL],
};

export const schemaWebSite = {
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
};

export const SCHEMA_IN_LANGUAGE = 'en' as const;
