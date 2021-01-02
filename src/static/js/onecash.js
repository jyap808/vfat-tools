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
  const BOARDROOM_ADDRESS = '0xFD35C0e9706A669d7be9B2D9C69AE2927F1071dB'
  const DAI_ONC_ADDRESS = '0x3Ba3C8fB0142A6f2bf3e2990A08957866203f961'
  const REWARD_TOKEN_ADDRESS = '0xD90E69f67203EBE02c917B5128629E77B4cd92dc'
  const BOARDROOM = new ethers.Contract(BOARDROOM_ADDRESS, ONECASH_BOARDROOM_ABI, App.provider)
  const share = await BOARDROOM.share()
  const sharePrice = getParameterCaseInsensitive(prices, share)?.usd
  const totalStaked = (await BOARDROOM.totalSupply()) / 1e18
  const totalStakedUsd = totalStaked * sharePrice
  _print(`Boardroom`)
  _print(`There is a total ${totalStaked.toFixed(2)} ONS ($${formatMoney(totalStakedUsd)}) staked in the Boardroom.`)

  const resp = await fetch('https://api.vfat.tools/twap/' + DAI_ONC_ADDRESS)
  const text = await resp.text()
  const array = text.split('\n')
  if (array.length > 0 && array[0][0] != '<') {
    const [, oldPrice1, oldTimestamp] = array[array.length - 2].split(' ') //last line is blank
    const [, price1, timestamp] = await getCurrentPriceAndTimestamp(App, DAI_ONC_ADDRESS)
    const twap = await calculateTwap(oldPrice1, oldTimestamp, price1, timestamp, 0)
    _print(`TWAP: ${twap}`)
    if (twap > 1.05) {
      const REWARD_TOKEN = new ethers.Contract(REWARD_TOKEN_ADDRESS, ERC20_ABI, App.provider)
      const totalSupply = (await REWARD_TOKEN.totalSupply()) / 1e18
      const newTokens = totalSupply * Math.min(twap - 1, 0.1)
      _print(`The following figures are approximate as they are not using the official TWAP.`)
      _print(`There will be ${newTokens.toFixed(2)} ONC issued at next expansion.`)
      const rewardPrice = getParameterCaseInsensitive(prices, REWARD_TOKEN_ADDRESS).usd
      const boardReturn = ((newTokens * rewardPrice) / totalStakedUsd) * 100 * 3 //3 times a day
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
    {
      address: '0x11dAb122FA5ab4D407521Ae1CA416dEFF198b688',
      abi: ONECASH_ABI,
      rewardToken: 'oneShare',
      stakeToken: 'lpt',
    },
    {
      address: '0x78A05fDA97C8458F07e03583fdaf05Ff6ee4f6C9',
      abi: ONECASH_ABI,
      rewardToken: 'oneShare',
      stakeToken: 'lpt',
    },
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

  await loadBoardroom(App, prices)

  hideLoading()
}
