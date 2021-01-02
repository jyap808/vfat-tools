$(function() {
  consoleInit()
  start(main)
})
async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, HYPE_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.lpt()

  const rewardTokenAddress = await STAKING_POOL.rewardToken()

  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress)

  if (stakeTokenAddress.toLowerCase() == rewardTokenAddress.toLowerCase()) {
    stakeToken.staked = (await STAKING_POOL.totalSupply()) / 10 ** stakeToken.decimals
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
  const rewardToken =
    getParameterCaseInsensitive(tokens, rewardTokenAddress) ?? (await getToken(App, rewardTokenAddress, stakingAddress))

  const poolPrices = getPoolPrices(tokens, prices, stakeToken)

  const stakingTokenTicker = poolPrices.stakingTokenTicker

  const stakeTokenPrice = getParameterCaseInsensitive(prices, stakeTokenAddress).usd
  const rewardTokenPrice = getParameterCaseInsensitive(prices, rewardTokenAddress).usd

  // Find out reward rate
  const weeklyRewards = await get_synth_weekly_rewards(STAKING_POOL)

  const usdPerWeek = weeklyRewards * rewardTokenPrice

  const staked_tvl = poolPrices.staked_tvl

  const userStaked = (await STAKING_POOL.balanceOf(App.YOUR_ADDRESS)) / 10 ** stakeToken.decimals

  poolPrices.print_price()
  const userStakedUsd = userStaked * stakeTokenPrice
  const userStakedPct = (userStakedUsd / staked_tvl) * 100
  _print(
    `You are staking ${userStaked.toFixed(6)} ${stakingTokenTicker} ` +
      `$${formatMoney(userStakedUsd)} (${userStakedPct.toFixed(2)}% of the pool).`
  )
  if (userStaked > 0) poolPrices.print_contained_price(userStaked)

  const weeklyAPY = (usdPerWeek / staked_tvl) * 100
  const dailyAPY = weeklyAPY / 7
  const yearlyAPY = weeklyAPY * 52
  _print(`APY: Day ${dailyAPY.toFixed(2)}% Week ${weeklyAPY.toFixed(2)}% Year ${yearlyAPY.toFixed(2)}%`)

  _print(`\n`)
}

async function main() {
  const CONTRACTS = ['0xcf7209fd19a29267ece09ff99831ae44635c6db4', '0x4573dFfca2Fd899793ab2f50B5E4D86cC7Dc28a3']

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c)
  }

  hideLoading()
}
