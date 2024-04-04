const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  setBalance,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Betting contract", () => {
  const deployBettingFixture = async () => {
    const contract = await ethers.deployContract("Betting");
    const [owner, address1, address2, address3, address4, address5] =
      await ethers.getSigners();

    await contract.waitForDeployment();

    return {
      contract,
      owner,
      address1,
      address2,
      address3,
      address4,
      address5,
    };
  };

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      const { owner, contract } = await loadFixture(deployBettingFixture);

      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Challanges", () => {
    /** challange [
     *  0 = challenged
     *  1 = challenger
     *  2 = judge
     *  3 = betAmount
     *  4 = active
     *  5 = accepted
     *  6 = winner
     * ]
     */
    const createBetFixture = async () => {
      const { contract, owner, address1, address2, address3 } =
        await loadFixture(deployBettingFixture);

      await setBalance(address1.address, ethers.parseEther("100000.0"));

      await contract
        .connect(address1)
        .createChallange({ value: ethers.parseEther("2.0") });

      return {
        contract,
        owner,
        address1,
        address2,
        address3,
      };
    };

    it("Should create a new challange", async () => {
      const { contract, address1 } = await loadFixture(deployBettingFixture);

      await setBalance(address1.address, ethers.parseEther("100000.0"));

      expect(
        await contract
          .connect(address1)
          .createChallange({ value: ethers.parseEther("2.0") })
      )
        .to.emit(contract, "ChallengeCreated")
        .withArgs(address1.address, ethers.parseEther("2.0"));

      const challange = await contract.bets(0);

      expect(challange[0]).to.equal(address1.address);
      expect(challange[3]).to.equal(ethers.parseEther("2.0"));
    });

    it("Should accept challanges", async () => {
      const { contract, address2 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther("100000.0"));

      expect(await contract.connect(address2)
        .acceptChallenge(0, { value: ethers.parseEther("2.0") })
      )
      .to.emit(contract, "ChallengeAccepted")
      .withArgs(address2.address, 0);

      const challange = await contract.bets(0);

      expect(challange[1]).to.equal(address2.address)
    });

    it("Should fail when ammout is different", async () => {
      const { contract, address2 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther("100000.0"));

      await expect(contract.connect(address2)
        .acceptChallenge(0, { value: ethers.parseEther("2.1") })
      ).to.be
      .revertedWith("Valor enviado diferente do valor da aposta.");
    });

    it("Should fail if the challenge is already accepted", async () => {
      const { contract, address2, address3 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther("100000.0"));
      await setBalance(address3.address, ethers.parseEther("100000.0"));

      await contract.connect(address2).acceptChallenge(0, { value: ethers.parseEther("2.0") });

      await expect(contract.connect(address3)
        .acceptChallenge(0, { value: ethers.parseEther("2.0") })
      ).to.be
      .revertedWith("Desafio nao esta ativo ou ja foi aceito.");
    });

    it("Should fail if the challenger is the challenged", async () => {
      const { contract, address1 } = await loadFixture(createBetFixture);

      await expect(contract.connect(address1)
        .acceptChallenge(0, { value: ethers.parseEther("2.0") })
      ).to.be
      .revertedWith("Voce nao pode aceitar o proprio desafio.");
    });
  });
});
