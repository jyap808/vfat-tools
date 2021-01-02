$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, stakingPool, stakingAddress, rewardTokenTicker, rewardTokenAddress, tokens, prices) {
  const lpt = await stakingPool.lpt()
  const poolToken = await getToken(App, lpt, stakingAddress)
  var newPriceAddresses = poolToken.tokens.filter(x => prices[x] == null)
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    prices[key] = newPrices[key]
  }
  var newTokenAddresses = poolToken.tokens.filter(x => tokens[x] == null)
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, stakingAddress)
  }
  const pp = getPoolPrices(tokens, prices, poolToken)
  pp.print_price()
  const rewardPrice = getParameterCaseInsensitive(prices, rewardTokenAddress)?.usd
  const poolRewardsPerWeek = await get_synth_weekly_rewards(stakingPool)
  var usdPerWeek = poolRewardsPerWeek * rewardPrice
  _print(`${rewardTokenTicker} Per Week: ${poolRewardsPerWeek.toFixed(2)} ($${formatMoney(usdPerWeek)})`)
  var weeklyAPY = (usdPerWeek / pp.staked_tvl) * 100
  var dailyAPY = weeklyAPY / 7
  var yearlyAPY = weeklyAPY * 52
  _print(`APY: Day ${dailyAPY.toFixed(2)}% Week ${weeklyAPY.toFixed(2)}% Year ${yearlyAPY.toFixed(2)}%`)

  _print(`\n`)
}

async function main() {
  const App = await init_ethers()

  _print('Reading smart contracts...')

  const rewardTokenTicker = 'METRIC'
  const rewardTokenAddress = '0xefc1c73a3d8728dc4cf2a18ac5705fe93e5914ac'
  const BUILD_POOL_ADDR = '0xb4D78f3a0fA97d42Bff0f7f9CeDFE2FE23eECA05'
  const METRIC_POOL_ADDR = '0xea322a8Ab474c2c27581b8aEaa5c594141Aa5Dfb'
  const BUILD_POOL = new ethers.Contract(BUILD_POOL_ADDR, STAKING_ABI, App.provider)
  const METRIC_POOL = new ethers.Contract(METRIC_POOL_ADDR, STAKING_ABI, App.provider)
  var tokens = {}
  var prices = {}

  await loadPool(App, METRIC_POOL, METRIC_POOL_ADDR, rewardTokenTicker, rewardTokenAddress, tokens, prices)
  await loadPool(App, BUILD_POOL, BUILD_POOL_ADDR, rewardTokenTicker, rewardTokenAddress, tokens, prices)
  hideLoading()
}
