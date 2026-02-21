import fs from 'node:fs/promises'
import pa11y from 'pa11y'

const LEVEL_RANK = {
  notice: 1,
  warning: 2,
  error: 3,
}

function shouldFailOnIssue(issueType, failLevel) {
  const issueRank = LEVEL_RANK[issueType] ?? LEVEL_RANK.error
  const failRank = LEVEL_RANK[failLevel] ?? LEVEL_RANK.error
  return issueRank >= failRank
}

async function main() {
  const [configPath = '.github/pa11yci.json', outputPath = 'pa11y-report.json'] =
    process.argv.slice(2)

  const configRaw = await fs.readFile(configPath, 'utf8')
  const config = JSON.parse(configRaw)
  const defaults = config.defaults ?? {}
  const urls = Array.isArray(config.urls) ? config.urls : []

  if (urls.length === 0) {
    throw new Error(`No URLs found in config: ${configPath}`)
  }

  const failLevel = defaults.level ?? 'error'
  const report = { results: [] }
  let hasFailure = false

  for (const url of urls) {
    try {
      const result = await pa11y(url, defaults)
      report.results.push({
        pageUrl: url,
        documentTitle: result.documentTitle,
        issues: result.issues,
      })

      if (result.issues.some((issue) => shouldFailOnIssue(issue.type, failLevel))) {
        hasFailure = true
      }
    } catch (error) {
      hasFailure = true
      report.results.push({
        pageUrl: url,
        documentTitle: '',
        issues: [
          {
            code: 'PA11Y_RUNTIME',
            message: error instanceof Error ? error.message : String(error),
            selector: 'html',
            context: '',
            type: 'error',
          },
        ],
      })
    }
  }

  const payload = JSON.stringify(report, null, 2)
  await fs.writeFile(outputPath, payload)
  console.log(payload)

  if (hasFailure) {
    process.exitCode = 2
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
