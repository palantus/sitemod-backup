routes.push(...[
  {path: "/backup/setup",          page: "/pages/backup/setup.mjs"},

  {regexp: /^\/backup\/backup\/([\d]+)\/log/,page: "../pages/backup/backuplog.mjs"},
  {regexp: /^\/backup\/job\/([\d]+)\/log/,page: "../pages/backup/joblog.mjs"},
  {regexp: /^\/backup\/job\/([\d]+)/,     page: "../pages/backup/job.mjs"},
])