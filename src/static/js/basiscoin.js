$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAbi, stakingAddress, rewardTokenFunction, stakeTokenFunction) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, stakingAbi, App.provider)

  const stakeTokenAddress = await STAKING_POOL.callStatic[stakeTokenFunction]()

  const rewardTokenAddress = await STAKING_POOL.callStatic[rewardTokenFunction]()

  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress)

  if (stakeTokenAddress.toLowerCase() == rewardTokenAddress.toLowerCase()) {
    stakeToken.staked = (await STAKING_POOL.totalSupply()) / 10 ** stakeToken.decimals
  }

  var newPriceAddresses = stakeToken.tokens.filter(x => !getParameterCaseInsensitive(prices, x))
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    if (newPrices[key]) prices[key] = newPrices[key]
  }
  if (stakeTokenFunction == 'SUSD') {
    prices[stakeTokenAddress] = {usd: 1} //...
  }
  var newTokenAddresses = stakeToken.tokens.filter(x => !getParameterCaseInsensitive(tokens, x))
  for (const address of newTokenAddresses) {
    tokens[address] = await getToken(App, address, stakingAddress)
  }
  if (!getParameterCaseInsensitive(tokens, rewardTokenAddress)) {
    tokens[rewardTokenAddress] = await getToken(App, rewardTokenAddress, stakingAddress)
  }
  const rewardToken = getParameterCaseInsensitive(tokens, rewardTokenAddress)

  const rewardTokenTicker = rewardToken.symbol

  const poolPrices = getPoolPrices(tokens, prices, stakeToken)

  const rewardTokenPrice = getParameterCaseInsensitive(prices, rewardTokenAddress)?.usd

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

async function loadBoardroom(App, prices) {
  const BOARDROOM_ADDRESS = Contracts.BASIS_COIN.Boardroom
  //const ORACLE_ADDRESS = "0x8a573cb5234657c8bf054da2ebe63b66fb1f9502";
  const REWARD_TOKEN_ADDRESS = Contracts.BASIS_COIN.Cash
  const BCC_DAI_ADDRESS = Contracts.BASIS_COIN.dai_bcc_lpt
  const BOARDROOM = new ethers.Contract(BOARDROOM_ADDRESS, BOARDROOM_ABI, App.provider)
  const share = await BOARDROOM.share()
  const sharePrice = getParameterCaseInsensitive(prices, share)?.usd
  const totalStaked = (await BOARDROOM.totalSupply()) / 1e18
  const totalStakedUsd = totalStaked * sharePrice
  _print(`Boardroom`)
  _print(`There is a total ${totalStaked.toFixed(2)} BCS ($${formatMoney(totalStakedUsd)}) staked in the Boardroom.`)
  _print(`You are staking ${userStaked} BCS ($${formatMoney(userStakedUsd)}), ${userPct.toFixed(2)}% of the pool.`)

  const resp = await fetch('https://api.vfat.tools/twap/' + BCC_DAI_ADDRESS)
  const text = await resp.text()
  const array = text.split('\n')
  if (array.length > 0 && array[0][0] != '<') {
    const [oldPrice0, , oldTimestamp] = array[array.length - 2].split(' ') //last line is blank
    const [price0, , timestamp] = await getCurrentPriceAndTimestamp(App, BCC_DAI_ADDRESS)
    const twap = await calculateTwap(oldPrice0, oldTimestamp, price0, timestamp, 0)
    _print(`TWAP: ${twap}`)
    if (twap > 1.05) {
      const REWARD_TOKEN = new ethers.Contract(REWARD_TOKEN_ADDRESS, ERC20_ABI, App.provider)
      const totalSupply = (await REWARD_TOKEN.totalSupply()) / 1e18
      const newTokens = totalSupply * (twap - 1)
      _print(`The following figures are approximate as they are not using the official TWAP.`)
      _print(`There will be ${newTokens.toFixed(2)} BCC issued at next expansion.`)
      const rewardPrice = getParameterCaseInsensitive(prices, REWARD_TOKEN_ADDRESS).usd
      const boardReturn = ((newTokens * rewardPrice) / totalStakedUsd) * 100
      _print(
        `Boardroom APR: Day ${boardReturn.toFixed(2)}% Week ${(boardReturn * 7).toFixed(2)}% Year ${(
          boardReturn * 365
        ).toFixed(2)}%`
      )
    }
  }
  _print(`\n`)
}

async function main() {
  const CONTRACTS = [
    Contracts.BASIS_COIN.DAIBCSLPTokenSharePool,
    Contracts.BASIS_COIN.DAIBCCLPTokenSharePool,
    Contracts.BASIS_COIN.BCCBACPool,
    Contracts.BASIS_COIN.BCCBASPool,
    Contracts.BASIS_COIN.BCCDAIPool,
    Contracts.BASIS_COIN.BCCDSDPool,
    Contracts.BASIS_COIN.BCCESDPool,
    Contracts.BASIS_COIN.BCCUSDCPool,
  ]

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}

  for (const c of CONTRACTS) {
    try {
      await loadPool(App, tokens, prices, c.abi, c.address, c.rewardToken, c.stakeToken)
    } catch (ex) {
      console.error(ex)
    }
  }

  //await loadBoardroom(App, tokens, prices);

  hideLoading()
}
