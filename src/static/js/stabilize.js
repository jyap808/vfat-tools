$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, prices, tokens, poolIndex, operator, operatorAddr, rewardTokenTicker, rewardTokenAddress) {
  const poolTokenAddress = await operator.poolTokenAddress(poolIndex)
  const poolToken = await getToken(App, poolTokenAddress, operatorAddr)
  const rewardRate = await operator.rewardRate(poolIndex)
  var newPriceAddresses = poolToken.tokens.filter(x => prices[x] == null)
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    prices[key] = newPrices[key]
  }
  var newTokenAddresses = poolToken.tokens.filter(x => tokens[x] == null)
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, operatorAddr)
  }
  const pp = getPoolPrices(tokens, prices, poolToken)
  pp.print_price()
  const rewardPrice = getParameterCaseInsensitive(prices, rewardTokenAddress)?.usd
  var poolRewardsPerWeek = (rewardRate / 1e18) * 604800 //rewardRate is STBZ per second
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

  _print('Reading smart contracts...\n')

  const OPERATOR_ADDR = '0xEe9156C93ebB836513968F92B4A67721f3cEa08a'
  const OPERATOR = new ethers.Contract(OPERATOR_ADDR, OPERATOR_ABI, App.provider)

  const poolCount = await OPERATOR.poolLength()

  _print(`Found ${poolCount} pools.\n`)

  var prices = {}
  var tokens = {}

  const rewardTokenTicker = 'STBZ'
  const rewardTokenAddress = '0xB987D48Ed8f2C468D52D6405624EADBa5e76d723'
  const rewardsMap = {1: 76000, 2: 57000, 3: 38000, 4: 19000}
  const rewardsPerWeek = rewardsMap[await OPERATOR.currentWeek()]

  for (i = 0; i < poolCount; i++) {
    await loadPool(App, prices, tokens, i, OPERATOR, OPERATOR_ADDR, rewardTokenTicker, rewardTokenAddress)
  }

  hideLoading()
}
