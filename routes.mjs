routes.push(...[
  {path: "/backup/setup",          page: "/pages/backup/setup.mjs"},

  {regexp: /^\/backup\/job\/([\d]+)/,     page: "../pages/backup/job.mjs"},
])