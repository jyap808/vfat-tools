$(function() {
  consoleInit()
  start(main)
})

async function getWeeklyRewards(App, stakingPool, rewardTokenDecimals) {
  const distributorAddress = await stakingPool.trueDistributor()
  const distributor = new ethers.Contract(distributorAddress, TRUEFI_DISTRIBUTOR_ABI, App.provider)
  const duration = await distributor.duration()
  const totalAmount = await distributor.totalAmount()
  return ((totalAmount / duration) * 604800) / 10 ** rewardTokenDecimals
}

const ichiRewardsContract_unstake = async function(ichiPool, App) {
  const signer = App.provider.getSigner()

  const currentStakedAmount = await ichiPool.staked(App.YOUR_ADDRESS)
  const earnedTokenAmount = (await ichiPool.claimable(App.YOUR_ADDRESS)) / 1e18

  if (earnedTokenAmount > 0) {
    showLoading()
    ichiPool
      .connect(signer)
      .unstake(currentStakedAmount, {gasLimit: 250000})
      .then(function(t) {
        return App.provider.waitForTransaction(t.hash)
      })
      .catch(function() {
        hideLoading()
      })
  }
}

const ichiRewardsContract_exit = async function(ichiPool, App) {
  const signer = App.provider.getSigner()

  const currentStakedAmount = await ichiPool.staked(App.YOUR_ADDRESS)

  if (currentStakedAmount / 1e18 > 0) {
    showLoading()
    ichiPool
      .connect(signer)
      .exit(currentStakedAmount, {gasLimit: 250000})
      .then(function(t) {
        return App.provider.waitForTransaction(t.hash)
      })
      .catch(function() {
        hideLoading()
      })
  }
}

const ichiRewardsContract_claim = async function(ichiPool, App) {
  const signer = App.provider.getSigner()

  console.log(App.YOUR_ADDRESS)

  const earnedYFFI = (await ichiPool.claimable(App.YOUR_ADDRESS)) / 1e18

  if (earnedYFFI > 0) {
    showLoading()
    ichiPool
      .connect(signer)
      .claim({gasLimit: 250000})
      .then(function(t) {
        return App.provider.waitForTransaction(t.hash)
      })
      .catch(function() {
        hideLoading()
      })
  }
}

async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, TRUE_FARM_ABI, App.provider)

  const stakeTokenAddress = await STAKING_POOL.stakingToken()

  const rewardTokenAddress = await STAKING_POOL.trustToken()

  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress)

  if (stakeTokenAddress.toLowerCase() == rewardTokenAddress.toLowerCase()) {
    stakeToken.staked = (await STAKING_POOL.totalStaked()) / 10 ** stakeToken.decimals
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
  const weeklyRewards = await getWeeklyRewards(App, STAKING_POOL, rewardToken.decimals)

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
    '0xED45Cf4895C110f464cE857eBE5f270949eC2ff4',
    '0x493945574d9D41c1b553a3E5b71090eFc99Bf929',
    '0xf8F14Fbb93fa0cEFe35Acf7e004fD4Ef92d8315a',
    '0x8FD832757F58F71BAC53196270A4a55c8E1a29D9',
  ]

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c)
  }

  hideLoading()
}
