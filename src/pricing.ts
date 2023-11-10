/* eslint-disable prefer-const */
import { BigDecimal, Address } from "@graphprotocol/graph-ts/index";
import { Pair, Token } from "../generated/schema";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./utils";


const BUSD_ADDRESS = "0xe9e7cea3dedca5984780bafc599bd69add087d56"
const ADDRESS_USDT = "0x55d398326f99059ff775485246999027b3197955";
const ADDRESS_USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
const WBNB_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const USDT_WBNB_PAIR = "0xe2bbf54dc0ccdd0cf6270f2af2f62ff79903bb27";

const STABLE_COIN_ADDRESSES = [BUSD_ADDRESS, ADDRESS_USDT, ADDRESS_USDC]

// от балды 
const MIN_USD_LIQUIDITY = BigDecimal.fromString("20000")

const WHITELIST: string[] = [
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
  "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
  "0x55d398326f99059ff775485246999027b3197955", // USDT
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
  "0x23396cf899ca06c4472205fc903bdb4de249d6fc", // UST
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB
  "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // WETH
  "0xd32d01a43c869edcd1117c640fbdcfcfd97d9d65", // NMX
];

export function getBnbPriceInUSD(): BigDecimal {
  const usdtPair = Pair.load(USDT_WBNB_PAIR); // usdt is token0
  if (usdtPair !== null) {
    return usdtPair.token0Price;
  } else {
    return ZERO_BD;
  }
}

export function deriveUSDPrice(
  reserve0: BigDecimal,
  reserve1: BigDecimal,
  token0: Token,
  token1: Token,
): DeriveUSDPriceResponse {
  if (STABLE_COIN_ADDRESSES.includes(token0.id)) {
    const token0PriceUsd = BigDecimal.fromString("1.0")
    const token1PriceUsd = _deriveUsdPrice(reserve0, reserve1)

    return {token0PriceUsd, token1PriceUsd}
  }
  
  if (STABLE_COIN_ADDRESSES.includes(token1.id)) {
    const token0PriceUsd = _deriveUsdPrice(reserve1, reserve0)
    const token1PriceUsd = BigDecimal.fromString("1.0")

    return {token0PriceUsd, token1PriceUsd}
  } 
  
  // if this pair doesn't have BUSD, trying to calculate either token price by querying existing liquidity 
  // that liquidity **MUST** exclude current pair reserves!
  // TODO: как быть если кто-то создаст пару SHIT/USDT и положит туда 10**9 SHIT и 1 USDT? Это не же означает
  // что у нас вдруг появился шит коин с ликвидностью в миллиард юсд! как раз таки его ликвидность - $1
  // следовательно правильнее считать ликвидность токена не на основании цены, а на основании ликвидности
  // контер валюты (всегда стейбл коин), а ликвидность пар двух щиткоинов расчитывать исходя из наличия у них именно этой
  // реальной ликвидности.

  // если оба токена уже с ценой, то надо найти взвешенную ликвидность исходя из соотношения цен в этой паре
  // т.е. допусти оба токена стоят $1 а если поделить резервы то выйдет что токен0 стоит 0.95 а токен1 — 1.05
  // следовательно надо trackedTotalLiquidityUSD 0-го токена умножить на 0.95, а 1-го — на 1.05
  // и после определния взвешеной trackedTotalLiquidityUSD следует снова определить цены
  // но сделать это следует только после того как будет отдебажено наивное определение цены
  // if (token0.trackedTotalLiquidityUSD.gt(MIN_USD_LIQUIDITY) && token1.trackedTotalLiquidityUSD.gt(MIN_USD_LIQUIDITY)) {
  //     // Цена токена рассчитаная исключая резервы текущей пары и предполагая что есть totalLiquidityUSD
  //     const token0PriceUsd = token0.trackedTotalLiquidityUSD.div(token0.trackedTotalLiquidity)
  //     // Цена токена рассчитаная исключая резервы текущей пары и предполагая что есть totalLiquidityUSD
  //     const token1PriceUsd = token1.trackedTotalLiquidityUSD.div(token1.trackedTotalLiquidity)

  //     return {token0PriceUsd, token1PriceUsd}
  // } 
  
  if (token0.trackedTotalLiquidityUSD.gt(MIN_USD_LIQUIDITY)) {
    // Цена токена рассчитаная исключая резервы текущей пары и предполагая что есть totalLiquidityUSD
    const token0PriceUsd = token0.trackedTotalLiquidityUSD.div(token0.trackedTotalLiquidity)
    const token1PriceUsd = token0PriceUsd.times(reserve0.div(reserve1))

    return {token0PriceUsd, token1PriceUsd}
  } 
  
  if (token1.trackedTotalLiquidityUSD.gt(MIN_USD_LIQUIDITY)) {
    const token1PriceUsd = token1.trackedTotalLiquidityUSD.div(token1.trackedTotalLiquidity)
    const token0PriceUsd = token1PriceUsd.div(reserve0.div(reserve1))

    return {token0PriceUsd, token1PriceUsd}
  }

  return {token0PriceUsd: ZERO_BD, token1PriceUsd: ZERO_BD}
}

class DeriveUSDPriceResponse {
 token0PriceUsd: BigDecimal;
 token1PriceUsd: BigDecimal;
};

function _deriveUsdPrice(usdReserves: BigDecimal, baseReserves: BigDecimal): BigDecimal {
  return usdReserves.div(baseReserves)
}

export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedUSD;
  let price1 = token1.derivedUSD;

  // both tokens have non-zero price
  if (price0.gt(ZERO_BD) && price1.gt(ZERO_BD)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString("2"));
  }

  // only first token has usd-derived price
  if (price0.gt(ZERO_BD)) {
    return tokenAmount0.times(price0);
  }

  // only second token has usd price
  if (price1.gt(ZERO_BD)) {
    return tokenAmount1.times(price1);
  }

  // neither token has derived price
  return ZERO_BD;
}

export function getTrackedLiquidityUSD(
    tokenAmount0: BigDecimal,
    token0: Token,
    tokenAmount1: BigDecimal,
    token1: Token
): BigDecimal {
  let price0 = token0.derivedUSD;
  let price1 = token1.derivedUSD;

  // both are priced tokens, take average of both amounts
  if (price0.gt(ZERO_BD) && price1.gt(ZERO_BD)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the priced token amount
  if (price0.gt(ZERO_BD)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the priced token amount
  if (price1.gt(ZERO_BD)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token has price, tracked volume is 0
  return ZERO_BD;
}