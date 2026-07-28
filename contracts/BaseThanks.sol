// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseThanks {
    struct Thanks {
        address sender;
        address receiver;
        string message;
        uint8 thanksType;
        uint256 timestamp;
    }

    struct User {
        uint256 sentCount;
        uint256 receivedCount;
        uint256 rewardPoints;
        address referralOf;
    }

    address public owner;
    uint256 public totalThanks;
    uint256 public senderPoints = 10;
    uint256 public receiverPoints = 4;
    uint256 public referrerBonus = 8;
    uint256 public userBonus = 5;
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    mapping(uint256 => Thanks) private thanksById;
    mapping(address => User) private users;

    event ThanksSent(
        uint256 indexed thanksId,
        address indexed sender,
        address indexed receiver,
        string message,
        uint8 thanksType,
        uint256 timestamp,
        address referrer
    );
    event PointsUpdated(uint256 senderPoints, uint256 receiverPoints, uint256 referrerBonus, uint256 userBonus);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function sendThanks(address receiver, string calldata message, uint8 thanksType, address referrer) external {
        bytes calldata raw = bytes(message);
        require(receiver != address(0), "zero receiver");
        require(raw.length > 0 && raw.length <= MAX_MESSAGE_LENGTH, "bad message");
        require(thanksType < 5, "bad type");

        uint256 thanksId = totalThanks++;
        thanksById[thanksId] = Thanks(msg.sender, receiver, message, thanksType, block.timestamp);

        User storage senderUser = users[msg.sender];
        User storage receiverUser = users[receiver];
        senderUser.sentCount++;
        receiverUser.receivedCount++;
        senderUser.rewardPoints += senderPoints;
        receiverUser.rewardPoints += receiverPoints;

        if (senderUser.referralOf == address(0) && referrer != address(0) && referrer != msg.sender) {
            senderUser.referralOf = referrer;
            senderUser.rewardPoints += userBonus;
            users[referrer].rewardPoints += referrerBonus;
        }

        emit ThanksSent(thanksId, msg.sender, receiver, message, thanksType, block.timestamp, senderUser.referralOf);
    }

    function setPoints(uint256 _senderPoints, uint256 _receiverPoints, uint256 _referrerBonus, uint256 _userBonus) external onlyOwner {
        senderPoints = _senderPoints;
        receiverPoints = _receiverPoints;
        referrerBonus = _referrerBonus;
        userBonus = _userBonus;
        emit PointsUpdated(_senderPoints, _receiverPoints, _referrerBonus, _userBonus);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getThanks(uint256 thanksId) external view returns (Thanks memory) {
        require(thanksId < totalThanks, "missing thanks");
        return thanksById[thanksId];
    }

    function getUser(address user) external view returns (User memory) {
        return users[user];
    }
}
