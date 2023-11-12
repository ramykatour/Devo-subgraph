import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { PairCreated } from "../generated/schema"
import { PairCreated as PairCreatedEvent } from "../generated/Contract/Contract"
import { handlePairCreated } from "../src/contract"
import { createPairCreatedEvent } from "./contract-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let token0 = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let token1 = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let pair = Address.fromString("0x0000000000000000000000000000000000000001")
    let param3 = BigInt.fromI32(234)
    let newPairCreatedEvent = createPairCreatedEvent(
      token0,
      token1,
      pair,
      param3
    )
    handlePairCreated(newPairCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("PairCreated created and stored", () => {
    assert.entityCount("PairCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "PairCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "token0",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "PairCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "token1",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "PairCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "pair",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "PairCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "param3",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
