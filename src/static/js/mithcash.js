$(function() {
  consoleInit()
  start(main)
})

async function loadPool(App, tokens, prices, stakingAbi, stakingAddress, rewardTokenFunction, stakeTokenFunction) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, stakingAbi, App.provider)

  const stakeTokenAddress = await STAKING_POOL.callStatic[stakeTokenFunction]()

  const rewardTokenAddress = await STAKING_POOL.callStatic[rewardTokenFunction]()

  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress)

  if (stakeTokenAddress.toLowerCase() === rewardTokenAddress.toLowerCase()) {
    stakeToken.staked = (await STAKING_POOL.totalSupply()) / 10 ** stakeToken.decimals
  }

  var newPriceAddresses = stakeToken.tokens.filter(x => !getParameterCaseInsensitive(prices, x))
  var newPrices = await lookUpTokenPrices(newPriceAddresses)
  for (const key in newPrices) {
    if (newPrices[key]) prices[key] = newPrices[key]
  }
  if (stakeTokenFunction === 'SUSD') {
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

  return {
    staked_tvl: poolPrices.staked_tvl,
  }
}

async function loadBoardroom(App, prices) {
  const BOARDROOM_ADDRESS = '0xb35f89160d1Dc47B6EAC1986D7821505c327AE09'
  const BOARDROOM = new ethers.Contract(BOARDROOM_ADDRESS, BOARDROOM_ABI, App.provider)
  const share = await BOARDROOM.share()
  const sharePrice = getParameterCaseInsensitive(prices, share)?.usd
  const totalStaked = (await BOARDROOM.totalSupply()) / 1e18
  const totalStakedUsd = totalStaked * sharePrice
  _print(`Boardroom`)
  _print(`There is a total ${totalStaked.toFixed(2)} MIS ($${formatMoney(totalStakedUsd)}) staked in the Boardroom.`)

  _print(`\n`)
}

async function main() {
  const CONTRACTS = [
    {
      address: '0x14E33e1D6Cc4D83D7476492C0A52b3d4F869d892',
      abi: MITH_USDTMIC_ABI,
      rewardToken: 'mithShare',
      stakeToken: 'lpt',
    },
    {
      address: '0x9D9418803F042CCd7647209b0fFd617981D5c619',
      abi: MITH_USDTMIC_ABI,
      rewardToken: 'mithShare',
      stakeToken: 'lpt',
    },
    {
      address: '0xd91121Ba462311626dA546C529b8F07c84805346',
      abi: MIC_MITH_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'mith',
    },
    {
      address: '0xcE0058827e6c89E625e524D2fE6E3EF3d9BB6A0c',
      abi: MIC_DAI_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'dai',
    },
    {
      address: '0xFEf1Bcc7097dD184b2Cdb574068CF01b7B437694',
      abi: MIC_YFI_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'YFI',
    },
    {
      address: '0xFb64597ddA1345317A4f4f5DBA2425384bC5fA7B',
      abi: MIC_USDT_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'usdt',
    },
    {
      address: '0x2F251D32D024938C4F98cFB8B22A2d1aF0d3167A',
      abi: MIC_ESD_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'esd',
    },
    {
      address: '0xa40F333f7f5FA17810C4F98Ed1a4061854f0294d',
      abi: MIC_BAC_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'bac',
    },
    {
      address: '0xdf8752BA251EF13f5A49Dcdd8E9D24809f078E91',
      abi: MIC_CREAM_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'cream',
    },
    {
      address: '0x3B3CE26239Ddc65dC3fd2124D242Ad056338eAF1',
      abi: MIC_FRAX_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'frax',
    },
    {
      address: '0x113690cb0EFa6A3D3F78c0F3BcA97cbCdc720903',
      abi: MIC_CRV_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'crv',
    },
    {
      address: '0x8e861153324024a2F3b26912B498f0c531830198',
      abi: MIC_BUSD_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'busd',
    },
    {
      address: '0x0555EEa5f419e18CFc338dEa66aE84Fa7A2fD2BA',
      abi: MIC_LINK_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'link',
    },
    {
      address: '0x192376b6433164dc4bf64319E6443011a6E84235',
      abi: MIC_COMP_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'comp',
    },
    {
      address: '0x7c0540852E552c2F6b981e89D2388E98935f9f4d',
      abi: MIC_AAVE_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'aave',
    },
    {
      address: '0xd1DE064281745F576eBa9cBff251aB031A0B8e99',
      abi: MIC_SUSHI_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'sushi',
    },
    {
      address: '0x52cC1501f081ba069EEDa35eE91E7bbeEdcca965',
      abi: MIC_SUSD_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'susd',
    },
    {
      address: '0x27392910FC7921aC3B451E6a4568906371941df8',
      abi: MIC_USDC_ABI,
      rewardToken: 'mithCash',
      stakeToken: 'usdc',
    },
  ]

  const App = await init_ethers()

  _print('Reading smart contracts...\n')

  var tokens = {}
  var prices = {}
  var totalStaked = 0

  for (const c of CONTRACTS) {
    try {
      const {staked_tvl} = await loadPool(App, tokens, prices, c.abi, c.address, c.rewardToken, c.stakeToken)
      totalStaked += staked_tvl
    } catch (ex) {
      console.error(ex)
    }
  }
  await loadBoardroom(App, prices)

  _print_bold(`Total staked: $${formatMoney(totalStaked)}`)

  hideLoading()
}
