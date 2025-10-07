# Prediction Market MVP - Common Commands

.PHONY: build test test-verbose test-gas coverage clean deploy-local deploy-testnet

# Build contracts
build:
	forge build

# Run tests
test:
	forge test

# Run tests with verbose output
test-verbose:
	forge test -vvv

# Run tests with gas reporting
test-gas:
	forge test --gas-report

# Generate test coverage
coverage:
	forge coverage

# Clean build artifacts
clean:
	forge clean

# Deploy to local Anvil
deploy-local:
	anvil &
	sleep 2
	forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy to testnet (requires .env file)
deploy-testnet:
	forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify

# Deploy to Avalanche Fuji testnet
deploy-fuji:
	forge script script/Deploy.s.sol:Deploy --rpc-url avalanche_fuji --broadcast --verify

# Run specific test
test-specific:
	forge test --match-test $(TEST)

# Run demo test with force resolve
test-demo:
	forge test --match-test testDemoFlowWithForceResolve -vvv

# Run force resolve tests
test-force-resolve:
	forge test --match-test testForceResolve -vvv

# Format code
format:
	forge fmt

# Lint code
lint:
	forge lint

# Install dependencies
install:
	forge install OpenZeppelin/openzeppelin-contracts@v4.9.3
	forge install foundry-rs/forge-std

# Update dependencies
update:
	forge update

# Show help
help:
	@echo "Available commands:"
	@echo "  build          - Build contracts"
	@echo "  test           - Run all tests"
	@echo "  test-verbose   - Run tests with verbose output"
	@echo "  test-gas       - Run tests with gas reporting"
	@echo "  coverage       - Generate test coverage"
	@echo "  clean          - Clean build artifacts"
	@echo "  deploy-local   - Deploy to local Anvil"
	@echo "  deploy-testnet - Deploy to testnet"
	@echo "  test-specific  - Run specific test (use TEST=testName)"
	@echo "  format         - Format code"
	@echo "  lint           - Lint code"
	@echo "  install        - Install dependencies"
	@echo "  update         - Update dependencies"
