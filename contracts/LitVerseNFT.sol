// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Intended for OpenZeppelin Contracts Upgradeable v5.x.
// Deploy behind an ERC1967/UUPS proxy; do not deploy this implementation directly.

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract LitVerseNFT is
    Initializable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC2981Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant GENESIS_LIMIT = 250;
    uint96 public constant DEFAULT_ROYALTY_BPS = 500;

    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public walletLimit;
    uint256 public saleStartTime;
    uint256 public saleEndTime;
    uint256 public platformFeeBps;
    uint256 public totalMinted;
    uint256 public genesisMinted;

    address payable public feeRecipient;
    address public royaltyReceiver;

    bool public publicSaleActive;
    bool public genesisSaleActive;

    mapping(address => uint256) public walletMinted;
    mapping(address => bool) public genesisEligible;
    mapping(address => bool) public hasMintedGenesis;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;

    event PublicMint(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event OwnerMint(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event GenesisEligibilityUpdated(address indexed wallet, bool eligible);
    event GenesisMint(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 royalty
    );
    event SaleConfigured(bool active, uint256 price, uint256 startTime, uint256 endTime);
    event PlatformFeeUpdated(uint256 feeBps, address feeRecipient);
    event RoyaltyUpdated(address receiver, uint96 royaltyBps);
    event Withdrawn(address indexed recipient, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address payable initialFeeRecipient,
        address initialRoyaltyReceiver,
        uint256 initialMaxSupply,
        uint256 initialMintPrice,
        uint256 initialWalletLimit
    ) external initializer {
        require(initialOwner != address(0), "Invalid owner");
        require(initialFeeRecipient != address(0), "Invalid fee recipient");
        require(initialRoyaltyReceiver != address(0), "Invalid royalty receiver");
        require(initialMaxSupply >= GENESIS_LIMIT, "Supply below genesis limit");
        require(initialWalletLimit > 0, "Invalid wallet limit");

        __ERC721_init("LitVerse", "LTV");
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        maxSupply = initialMaxSupply;
        mintPrice = initialMintPrice;
        walletLimit = initialWalletLimit;
        feeRecipient = initialFeeRecipient;
        royaltyReceiver = initialRoyaltyReceiver;
        platformFeeBps = 250;

        _setDefaultRoyalty(initialRoyaltyReceiver, DEFAULT_ROYALTY_BPS);
    }

    modifier onlyWhilePublicSale() {
        require(publicSaleActive, "Public sale inactive");
        require(block.timestamp >= saleStartTime, "Sale not started");
        require(saleEndTime == 0 || block.timestamp <= saleEndTime, "Sale ended");
        _;
    }

    function configureSale(
        bool active,
        uint256 price,
        uint256 startTime,
        uint256 endTime,
        uint256 newWalletLimit
    ) external onlyOwner {
        require(endTime == 0 || endTime >= startTime, "Invalid sale window");
        require(newWalletLimit > 0, "Invalid wallet limit");
        publicSaleActive = active;
        mintPrice = price;
        saleStartTime = startTime;
        saleEndTime = endTime;
        walletLimit = newWalletLimit;
        emit SaleConfigured(active, price, startTime, endTime);
    }

    function publicMint(string calldata uri)
        external
        payable
        whenNotPaused
        nonReentrant
        onlyWhilePublicSale
        returns (uint256 tokenId)
    {
        require(msg.value == mintPrice, "Incorrect payment");
        require(totalMinted < maxSupply, "Max supply reached");
        require(walletMinted[msg.sender] < walletLimit, "Wallet limit reached");

        tokenId = ++totalMinted;
        walletMinted[msg.sender] += 1;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit PublicMint(msg.sender, tokenId, uri);
    }

    function ownerMint(address recipient, string calldata uri)
        external
        onlyOwner
        whenNotPaused
        returns (uint256 tokenId)
    {
        require(recipient != address(0), "Invalid recipient");
        require(totalMinted < maxSupply, "Max supply reached");

        tokenId = ++totalMinted;
        walletMinted[recipient] += 1;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);

        emit OwnerMint(recipient, tokenId, uri);
    }

    // Genesis NFTs are part of the same collection and the same maxSupply.
    // The owner controls eligibility; each wallet may claim once.
    function setGenesisSaleActive(bool active) external onlyOwner {
        genesisSaleActive = active;
    }

    function setGenesisEligibility(address wallet, bool eligible) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        genesisEligible[wallet] = eligible;
        emit GenesisEligibilityUpdated(wallet, eligible);
    }

    function setGenesisEligibilityBatch(address[] calldata wallets, bool eligible)
        external
        onlyOwner
    {
        require(wallets.length <= GENESIS_LIMIT, "Batch too large");
        for (uint256 i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "Invalid wallet");
            genesisEligible[wallets[i]] = eligible;
            emit GenesisEligibilityUpdated(wallets[i], eligible);
        }
    }

    function genesisMint(string calldata uri)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId)
    {
        require(genesisSaleActive, "Genesis mint inactive");
        require(genesisEligible[msg.sender], "Wallet not eligible");
        require(!hasMintedGenesis[msg.sender], "Genesis already claimed");
        require(genesisMinted < GENESIS_LIMIT, "Genesis supply reached");
        require(totalMinted < maxSupply, "Max supply reached");

        hasMintedGenesis[msg.sender] = true;
        genesisMinted += 1;
        tokenId = ++totalMinted;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit GenesisMint(msg.sender, tokenId, uri);
    }

    function listNFT(uint256 tokenId, uint256 price) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be positive");
        require(
            getApproved(tokenId) == address(this) || isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({seller: msg.sender, price: price});
        emit Listed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not listing seller");
        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function buyNFT(uint256 tokenId) external payable whenNotPaused nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "Not listed");
        require(msg.value == listing.price, "Incorrect payment");
        require(ownerOf(tokenId) == listing.seller, "Seller no longer owns NFT");

        delete listings[tokenId];

        uint256 platformFee = (listing.price * platformFeeBps) / BPS_DENOMINATOR;
        (address royaltyReceiverForToken, uint256 royaltyAmount) =
            royaltyInfo(tokenId, listing.price);
        uint256 totalDeductions = platformFee + royaltyAmount;
        require(totalDeductions <= listing.price, "Fees exceed sale price");

        uint256 sellerProceeds = listing.price - totalDeductions;

        _sendValue(feeRecipient, platformFee);
        if (royaltyAmount > 0) {
            _sendValue(payable(royaltyReceiverForToken), royaltyAmount);
        }
        _sendValue(payable(listing.seller), sellerProceeds);

        _safeTransfer(listing.seller, msg.sender, tokenId, "");
        emit NFTSold(tokenId, listing.seller, msg.sender, listing.price, platformFee, royaltyAmount);
    }

    function setPlatformFee(uint256 newFeeBps, address payable newFeeRecipient)
        external
        onlyOwner
    {
        require(newFeeBps <= 500, "Fee above 5 percent");
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        platformFeeBps = newFeeBps;
        feeRecipient = newFeeRecipient;
        emit PlatformFeeUpdated(newFeeBps, newFeeRecipient);
    }

    function setRoyalty(address newReceiver, uint96 newRoyaltyBps) external onlyOwner {
        require(newReceiver != address(0), "Invalid royalty receiver");
        require(newRoyaltyBps <= 1000, "Royalty above 10 percent");
        royaltyReceiver = newReceiver;
        _setDefaultRoyalty(newReceiver, newRoyaltyBps);
        emit RoyaltyUpdated(newReceiver, newRoyaltyBps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw(address payable recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance");
        _sendValue(recipient, amount);
        emit Withdrawn(recipient, amount);
    }

    function _sendValue(address payable recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success,) = recipient.call{value: amount}("");
        require(success, "Payment transfer failed");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        require(!paused(), "Token transfers paused");
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            ERC721URIStorageUpgradeable,
            ERC2981Upgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    uint256[40] private __gap;
}
