$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, KITTEN_201_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.LP_TOKEN()

  const rewardTokenAddress = await STAKING_POOL.REWARD_TOKEN()

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
  const CONTRACTS = [
    '0x26Ec7cfcdd57c0d27122349d8740B42E8E24bB0b',
    '0xF06E97f30Ead2FCeeA67e344F71AA882C9126F07',
    '0xFEEab154863a0F0095a6a3C5a07CA10d1f629D78',
    '0x8A20Af65E3Caef30072DBd6b48aAAd10FD4a9eD7',
    '0x522c926f681126828DB07CBA012Fe1108aebf051',
    '0x7B724fB188295E10BcDFf007305aF22eC586743A',
  ]

  const App = await init_ethers()

  _print(`Initialized ${App.YOUR_ADDRESS}`)
  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c)
  }

  hideLoading()
}
