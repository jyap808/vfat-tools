$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, DEBASE_STAKING_POOL_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.y()

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
  let rewardToken = getParameterCaseInsensitive(tokens, rewardTokenAddress)

  if (!rewardToken) {
    newPrices = await lookUpTokenPrices([rewardTokenAddress])
    for (const key in newPrices) {
      prices[key] = newPrices[key]
    }
    tokens[rewardTokenAddress] = await getToken(App, rewardTokenAddress, stakingAddress)
    rewardToken = tokens[rewardTokenAddress]
  }

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
    contracts.debaseDaiLpPool,
    contracts.debaseDaiPool,
    contracts.degovDaiLpPool,
    contracts.stabilizerPool,
  ]

  const App = await init_ethers()
  _print('Beta Version: APY is not being calculated for the Stabilizer pool.\n')

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c)
  }

  hideLoading()
}

const contracts = {
  degov: '0x469E66e06fEc34839E5eB1273ba85A119B8D702F',
  debase: '0x9248c485b0B80f76DA451f167A8db30F33C70907',
  debasePolicy: '0x989Edd2e87B1706AB25b2E8d9D9480DE3Cc383eD',
  governorAlpha: '0x291BC8eDFE98155224502282444cC2E98d80d2d5',
  timelock: '0x969e1d56682305963c6b7f8920D0200189B22482',
  debaseDaiPool: '0xf5cB771023706Ca566eA6128b88e03A262737479',
  debaseDaiLpPool: '0xF4168cc431e9a8310e595dB9F7E2564cC96F5D51',
  degovDaiLpPool: '0xaB68de2a9d9A733F3c4CFE52Af7Fc4f6aa015637',
  orchestrator: '0x177A1F55Df0F28d8e9F5C837C706E04A82890025',
  dai: '0x6b175474e89094c44da98b954eedeac495271d0f',
  debaseDaiLp: '0xE98f89a2B3AeCDBE2118202826478Eb02434459A',
  oracle: '0xb1Df2F0C76074eD466510F4440772Cc7b3D5337C',
  stabilizerPool: '0x800479a76dc74c3a9FAAE25320A0EE4E8740996b',
}
