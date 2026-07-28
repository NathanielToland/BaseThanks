// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external returns (bytes4);
}

contract BaseKudos {
    struct Kudos {
        address sender;
        address receiver;
        uint256 cardType;
        string message;
        uint256 timestamp;
    }

    struct User {
        uint256 sentCount;
        uint256 receivedCount;
        uint256 rewardPoints;
        address referralOf;
    }

    address public owner;
    string private baseURI;
    uint256 public totalKudos;
    uint256 public senderPoints = 10;
    uint256 public receiverPoints = 4;
    uint256 public referrerBonus = 8;
    uint256 public userBonus = 5;
    uint256 public constant MAX_MESSAGE_LENGTH = 240;
    uint256 public constant CARD_TYPES = 3;

    mapping(uint256 => Kudos) private kudosById;
    mapping(address => User) private users;
    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => bool)) private operatorApprovals;

    event KudosSent(uint256 indexed kudosId, address indexed sender, address indexed receiver, uint256 cardType, string message, uint256 timestamp, address referrer);
    event PointsUpdated(uint256 senderPoints, uint256 receiverPoints, uint256 referrerBonus, uint256 userBonus);
    event URI(string value, uint256 indexed id);
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(string memory initialURI) {
        owner = msg.sender;
        baseURI = initialURI;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function sendKudos(address receiver, uint256 cardType, string calldata message, address referrer) external {
        require(receiver != address(0), "zero receiver");
        require(cardType < CARD_TYPES, "bad card");
        require(bytes(message).length <= MAX_MESSAGE_LENGTH, "message too long");

        uint256 kudosId = totalKudos++;
        kudosById[kudosId] = Kudos(msg.sender, receiver, cardType, message, block.timestamp);

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

        _mint(receiver, cardType, 1);
        emit KudosSent(kudosId, msg.sender, receiver, cardType, message, block.timestamp, senderUser.referralOf);
    }

    function setPoints(uint256 _senderPoints, uint256 _receiverPoints, uint256 _referrerBonus, uint256 _userBonus) external onlyOwner {
        senderPoints = _senderPoints;
        receiverPoints = _receiverPoints;
        referrerBonus = _referrerBonus;
        userBonus = _userBonus;
        emit PointsUpdated(_senderPoints, _receiverPoints, _referrerBonus, _userBonus);
    }

    function setURI(string calldata newURI) external onlyOwner {
        baseURI = newURI;
        for (uint256 i; i < CARD_TYPES; i++) emit URI(newURI, i);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getKudos(uint256 kudosId) external view returns (Kudos memory) {
        require(kudosId < totalKudos, "missing kudos");
        return kudosById[kudosId];
    }

    function getUser(address user) external view returns (User memory) {
        return users[user];
    }

    function uri(uint256) external view returns (string memory) {
        return baseURI;
    }

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "zero account");
        return balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory batchBalances) {
        require(accounts.length == ids.length, "length mismatch");
        batchBalances = new uint256[](accounts.length);
        for (uint256 i; i < accounts.length; i++) batchBalances[i] = balanceOf(accounts[i], ids[i]);
    }

    function setApprovalForAll(address operator, bool approved) external {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external {
        require(from == msg.sender || operatorApprovals[from][msg.sender], "not approved");
        _transfer(from, to, id, value);
        if (to.code.length > 0) require(IERC1155Receiver(to).onERC1155Received(msg.sender, from, id, value, data) == IERC1155Receiver.onERC1155Received.selector, "bad receiver");
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external {
        require(from == msg.sender || operatorApprovals[from][msg.sender], "not approved");
        require(ids.length == values.length, "length mismatch");
        for (uint256 i; i < ids.length; i++) _transfer(from, to, ids[i], values[i]);
        emit TransferBatch(msg.sender, from, to, ids, values);
        if (to.code.length > 0) require(IERC1155Receiver(to).onERC1155BatchReceived(msg.sender, from, ids, values, data) == IERC1155Receiver.onERC1155BatchReceived.selector, "bad receiver");
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0xd9b67a26 || interfaceId == 0x0e89341c;
    }

    function _mint(address to, uint256 id, uint256 value) internal {
        balances[id][to] += value;
        emit TransferSingle(msg.sender, address(0), to, id, value);
    }

    function _transfer(address from, address to, uint256 id, uint256 value) internal {
        require(to != address(0), "zero to");
        uint256 fromBalance = balances[id][from];
        require(fromBalance >= value, "low balance");
        unchecked {
            balances[id][from] = fromBalance - value;
        }
        balances[id][to] += value;
        emit TransferSingle(msg.sender, from, to, id, value);
    }
}
