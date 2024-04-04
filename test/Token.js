const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Token contract", () => {
  const deployTokenFixture = async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const contract = await ethers.deployContract("Token");

    return { contract, owner, addr1, addr2 };
  };

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      const { owner, contract } = await loadFixture(deployTokenFixture);

      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Deployment should assign the total supply of tokens to the owner", async () => {
      const { contract, owner } = await loadFixture(deployTokenFixture);

      const ownerBalance = await contract.balanceOf(owner.address);

      expect(await contract.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", () => {
    it("Should transfer tokens between accounts", async () => {
      const { contract, addr1, addr2 } = await await loadFixture(
        deployTokenFixture
      );

      await contract.transfer(addr1.address, 50);
      expect(await contract.balanceOf(addr1.address)).to.equal(50);

      await contract.connect(addr1).transfer(addr2.address, 50);
      expect(await contract.balanceOf(addr2.address)).to.equal(50);
    });

    it("Should emit Transfer event", async () => {
      const { contract, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await expect(contract.transfer(addr1.address, 50))
        .to.emit(contract, "Transfer")
        .withArgs(owner.address, addr1.address, 50);

      await expect(contract.connect(addr1).transfer(addr2.address, 50))
        .to.emit(contract, "Transfer")
        .withArgs(addr1.address, addr2.address, 50);
    });

    it("Should fail if sender doen't have enough tokens", async () => {
      const { contract, owner, addr1 } = await loadFixture(deployTokenFixture);

      const initialOwnerBalance = await contract.balanceOf(owner.address);

      await expect(
        contract.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("Not enough token");

      expect(await contract.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });
});
