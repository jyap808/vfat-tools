$(function() {
  consoleInit()
  start(main)
})

async function loadPool(
  App,
  prices,
  tokens,
  poolIndex,
  chefAbi,
  chefContract,
  chefAddr,
  totalAllocPoints,
  rewardsPerWeek,
  rewardTokenTicker,
  rewardTokenAddress,
  pendingRewardsFunctionName
) {
  const poolInfo = await getPoolInfo(App, chefContract, chefAddr, poolIndex, pendingRewardsFunctionName)
  var newPriceAddresses = poolInfo.poolToken.tokens.filter(x => prices[x] == null)
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    prices[key] = newPrices[key]
  }
  var newTokenAddresses = poolInfo.poolToken.tokens.filter(x => tokens[x] == null)
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, chefAddr)
  }
  if (poolInfo.stakedToken != null) {
    printStakedLPPrice(
      App,
      prices,
      tokens,
      poolInfo,
      chefAbi,
      chefAddr,
      totalAllocPoints,
      rewardsPerWeek,
      rewardTokenTicker,
      rewardTokenAddress,
      pendingRewardsFunctionName,
      poolIndex
    )
  } else {
    const pp = getPoolPrices(tokens, prices, poolInfo.poolToken)
    pp.print_price()
    const rewardPrice = getParameterCaseInsensitive(prices, rewardTokenAddress)?.usd
    var poolRewardsPerWeek = (poolInfo.allocPoints / totalAllocPoints) * rewardsPerWeek
    var usdPerWeek = poolRewardsPerWeek * rewardPrice
    _print(`${rewardTokenTicker} Per Week: ${poolRewardsPerWeek.toFixed(2)} ($${formatMoney(usdPerWeek)})`)
    var weeklyAPY = (usdPerWeek / pp.staked_tvl) * 100
    var dailyAPY = weeklyAPY / 7
    var yearlyAPY = weeklyAPY * 52
    _print(`APY: Day ${dailyAPY.toFixed(6)}% Week ${weeklyAPY.toFixed(6)}% Year ${yearlyAPY.toFixed(6)}%`)
    _print(
      `RTC APY: Day ${(dailyAPY * 10000).toFixed(2)}% Week ${(weeklyAPY * 10000).toFixed(2)}% Year ${(
        yearlyAPY * 10000
      ).toFixed(2)}%`
    )

    _print(`\n`)
  }
}

async function main() {
  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  const CAPTAIN_COOK_ADDR = '0xf8bfd0cf1c6f948339d5bd78444bebd78e43ae26'
  const CAPTAIN_COOK = new ethers.Contract(CAPTAIN_COOK_ADDR, CAPTAIN_COOK_ABI, App.provider)

  const poolCount = await CAPTAIN_COOK.poolLength()
  const totalAllocPoints = await CAPTAIN_COOK.totalAllocPoint()

  _print(`Found ${poolCount} pools.\n`)

  var prices = {}
  var tokens = {}

  const rewardTokenPoolIndex = 10
  const rewardTokenTicker = 'SWSH'
  const rewardTokenAddress = await CAPTAIN_COOK.swapship()
  const rewardsPerWeek = (((await CAPTAIN_COOK.swapshipPerBlock()) / 1e18) * 604800) / 13.5
  const blockNumber = await App.provider.getBlockNumber()

  _print(`*** There is an RTC airdrop valued at 10000 times your claimed SWSH from the pool ***\n`)
  _print(`*** Please remember to claim your SWSH in order to be eligible for each airdrop.  ***\n`)

  await loadPool(
    App,
    prices,
    tokens,
    rewardTokenPoolIndex,
    CAPTAIN_COOK_ABI,
    CAPTAIN_COOK,
    CAPTAIN_COOK_ADDR,
    totalAllocPoints,
    rewardsPerWeek,
    rewardTokenTicker,
    rewardTokenAddress,
    'pendingSwapShip',
    blockNumber
  )

  for (i = 0; i < poolCount; i++) {
    if (i != rewardTokenPoolIndex) {
      await loadPool(
        App,
        prices,
        tokens,
        i,
        CAPTAIN_COOK_ABI,
        CAPTAIN_COOK,
        CAPTAIN_COOK_ADDR,
        totalAllocPoints,
        rewardsPerWeek,
        rewardTokenTicker,
        rewardTokenAddress,
        'pendingSwapShip',
        blockNumber
      )
    }
  }

  hideLoading()
}
