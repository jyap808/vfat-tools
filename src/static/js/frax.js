$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, FRAX_STAKING_POOL_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.stakingToken()

  const rewardTokenAddress = await STAKING_POOL.rewardsToken()

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
  const Contracts = {
    Tokens: {
      FXS: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
      FRAX: '0x853d955acef822db058eb8505911ed77f175b99e',
    },
    Pools: {
      USDC: '0x3C2982CA260e870eee70c423818010DfeF212659',
      USDT: '0x7d3fcd3825ae54e8e8ffd3d0ce95882330d54968',
    },
    Staking: {
      FXS_WETH: '0xDc65f3514725206Dd83A8843AAE2aC3D99771C88',
      FRAX_WETH: '0xD875628B942f8970De3CcEaf6417005F68540d4f',
      FRAX_USDC: '0xa29367a3f057F3191b62bd4055845a33411892b6',
      FRAX_FXS: '0xda2c338350a0E59Ce71CDCED9679A3A590Dd9BEC',
    },
  }

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const [, address] of Object.entries(Contracts.Staking)) {
    await loadPool(App, tokens, prices, address)
  }

  hideLoading()
}
