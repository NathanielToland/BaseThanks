export const baseThanksAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "oldOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner", type: "address", indexed: true, internalType: "address" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PointsUpdated",
    inputs: [
      { name: "senderPoints", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "receiverPoints", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "referrerBonus", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "userBonus", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ThanksSent",
    inputs: [
      { name: "thanksId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "receiver", type: "address", indexed: true, internalType: "address" },
      { name: "message", type: "string", indexed: false, internalType: "string" },
      { name: "thanksType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "referrer", type: "address", indexed: false, internalType: "address" }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "MAX_MESSAGE_LENGTH",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getThanks",
    inputs: [{ name: "thanksId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct BaseThanks.Thanks",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "receiver", type: "address", internalType: "address" },
          { name: "message", type: "string", internalType: "string" },
          { name: "thanksType", type: "uint8", internalType: "uint8" },
          { name: "timestamp", type: "uint256", internalType: "uint256" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUser",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct BaseThanks.User",
        components: [
          { name: "sentCount", type: "uint256", internalType: "uint256" },
          { name: "receivedCount", type: "uint256", internalType: "uint256" },
          { name: "rewardPoints", type: "uint256", internalType: "uint256" },
          { name: "referralOf", type: "address", internalType: "address" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "receiverPoints",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "referrerBonus",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "sendThanks",
    inputs: [
      { name: "receiver", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "thanksType", type: "uint8", internalType: "uint8" },
      { name: "referrer", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "senderPoints",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setPoints",
    inputs: [
      { name: "_senderPoints", type: "uint256", internalType: "uint256" },
      { name: "_receiverPoints", type: "uint256", internalType: "uint256" },
      { name: "_referrerBonus", type: "uint256", internalType: "uint256" },
      { name: "_userBonus", type: "uint256", internalType: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "totalThanks",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "userBonus",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  }
] as const;
