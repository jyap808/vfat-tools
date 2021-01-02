$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAddress, scalingFactors) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, KITTEN_101_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.LP_TOKEN()

  const rewardTokenAddress = await STAKING_POOL.REWARD_TOKEN()

  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress)

  if (stakeTokenAddress.toLowerCase() == rewardTokenAddress.toLowerCase()) {
    stakeToken.staked = ((await STAKING_POOL.totalSupply()) / 10 ** stakeToken.decimals) * stakeScalingFactor
  }

  var newPriceAddresses = stakeToken.tokens.filter(x => prices[x] == null)
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    prices[key] = newPrices[key]
  }
  var newTokenAddresses = stakeToken.tokens.filter(x => tokens[x] == null)
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, stakingAddress)
  }
  const rewardToken = getParameterCaseInsensitive(tokens, rewardTokenAddress)

  const rewardScalingFactor = rewardToken.totalSupply / (await STAKING_POOL.origTotalSupply())

  const stakeScalingFactor = getParameterCaseInsensitive(scalingFactors, stakeTokenAddress) ?? 1
  if (stakeScalingFactor != 1) {
    stakeToken.totalSupply = stakeToken.totalSupply * stakeScalingFactor
    stakeToken.staked = stakeToken.staked * stakeScalingFactor
    stakeToken.unstaked = stakeToken.unstaked * stakeScalingFactor
  }

  const rewardTokenTicker = rewardToken.symbol

  const poolPrices = getPoolPrices(tokens, prices, stakeToken)

  const rewardTokenPrice = getParameterCaseInsensitive(prices, rewardTokenAddress).usd

  // Find out reward rate
  const weeklyRewards = (await get_synth_weekly_rewards(STAKING_POOL)) * rewardScalingFactor

  const usdPerWeek = weeklyRewards * rewardTokenPrice

  const staked_tvl = poolPrices.staked_tvl

  poolPrices.print_price()
  _print(`${rewardTokenTicker} Per Week: ${weeklyRewards.toFixed(2)} ($${formatMoney(usdPerWeek)})`)
  const weeklyAPY = (usdPerWeek / staked_tvl) * 100
  const dailyAPY = weeklyAPY / 7
  const yearlyAPY = weeklyAPY * 52
  _print(`APY: Day ${dailyAPY.toFixed(2)}% Week ${weeklyAPY.toFixed(2)}% Year ${yearlyAPY.toFixed(2)}%`)

  _print(`\n`)
}

async function main() {
  const CONTRACTS = [
    '0xCA3239A9aCa196dE1AF4D0ECA6D669e6EbF4BA8b',
    '0x0dF634aAE01eBf86C770A62Efec1102309E7db51',
    '0x02e4B5BE2c31cD38Ad987D0f493049429B20b876',
  ]

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}
  var scalingFactors = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c, scalingFactors)
  }

  hideLoading()
}
