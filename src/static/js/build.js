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

  const DAI_BCRED_ADDRESS = '0xf6e74879c54349db7c84f43c335d8104c3da5684'
  const bCredPoolToken = await getToken(App, DAI_BCRED_ADDRESS, App.YOUR_ADDRESS)

  var newPriceAddresses = Array.concat(stakeToken.tokens, bCredPoolToken.tokens).filter(x => prices[x] == null)
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    prices[key] = newPrices[key]
  }
  var newTokenAddresses = Array.concat(stakeToken.tokens, bCredPoolToken.tokens).filter(x => tokens[x] == null)
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, stakingAddress)
  }
  getPoolPrices(tokens, prices, bCredPoolToken)

  const rewardToken = getParameterCaseInsensitive(tokens, rewardTokenAddress)

  const rewardTokenTicker = rewardToken.symbol

  const poolPrices = getPoolPrices(tokens, prices, stakeToken)

  const rewardTokenPrice = getParameterCaseInsensitive(prices, rewardTokenAddress).usd

  // Find out reward rate
  const weeklyRewards = await get_synth_weekly_rewards(STAKING_POOL)

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
  const CONTRACTS = ['0x4ee08a94279a3ad241f8f785a1abdec775809a62']

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c)
  }

  hideLoading()
}
