const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  loadFixture,
  setBalance,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('Betting contract', () => {
  const deployBettingFixture = async () => {
    const contract = await ethers.deployContract('Betting');
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

  /** Hardhat tutorial */
  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      const { owner, contract } = await loadFixture(deployBettingFixture);

      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe('Challanges', () => {
    /** challange [
     *  0 = challenged
     *  1 = challenger
     *  2 = judge
     *  3 = betAmount
     *  4 = betBalance
     *  5 = active
     *  6 = accepted
     *  7 = winner
     *  8 = createdAt
     *  9 = acceotedAt
     *  10 = finishedAt
     * ]
     */
    const createBetFixture = async () => {
      const { contract, owner, address1, address2, address3, address4 } =
        await loadFixture(deployBettingFixture);

      await setBalance(address1.address, ethers.parseEther('100000.0'));

      await contract
        .connect(address1)
        .createChallange({ value: ethers.parseEther('2.0') });

      return {
        contract,
        owner,
        address1,
        address2,
        address3,
        address4,
      };
    };

    const acceptChallengeFixture = async () => {
      const { contract, owner, address1, address2, address3, address4 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther('10000.0'));

      await contract
        .connect(address2)
        .acceptChallenge(0, { value: ethers.parseEther('2.0') });

      return {
        contract,
        owner,
        address1,
        address2,
        address3,
        address4,
      }
    };

    const setJudgeFixture = async () => {
      const { contract, owner, address1, address2, address3, address4 } = await loadFixture(acceptChallengeFixture);

      await contract
        .connect(address3)
        .setJudge(0);

      return {
        contract,
        owner,
        address1,
        address2,
        address3,
        address4,
      }
    };

    it('Should create a new challange', async () => {
      const { contract, address1 } = await loadFixture(deployBettingFixture);

      await setBalance(address1.address, ethers.parseEther('100000.0'));

      expect(
        await contract
          .connect(address1)
          .createChallange({ value: ethers.parseEther('2.0') })
      )
        .to.emit(contract, 'ChallengeCreated')
        .withArgs(address1.address, ethers.parseEther('2.0'));

      const challange = await contract.bets(0);

      expect(challange[0]).to.equal(address1.address);
      expect(challange[3]).to.equal(ethers.parseEther('2.0'));
    });

    it('Should accept challanges', async () => {
      const { contract, address2 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther('100000.0'));

      expect(await contract.connect(address2)
        .acceptChallenge(0, { value: ethers.parseEther('2.0') })
      )
      .to.emit(contract, 'ChallengeAccepted')
      .withArgs(address2.address, 0);

      const challange = await contract.bets(0);

      expect(challange[1]).to.equal(address2.address)
    });

    it('Should fail when ammout is different', async () => {
      const { contract, address2 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther('100000.0'));

      await expect(contract.connect(address2)
        .acceptChallenge(0, { value: ethers.parseEther('2.1') })
      ).to.be
      .revertedWith('Valor enviado diferente do valor da aposta.');
    });

    it('Should fail if the challenge is already accepted', async () => {
      const { contract, address2, address3 } = await loadFixture(createBetFixture);

      await setBalance(address2.address, ethers.parseEther('100000.0'));
      await setBalance(address3.address, ethers.parseEther('100000.0'));

      await contract.connect(address2).acceptChallenge(0, { value: ethers.parseEther('2.0') });

      await expect(contract.connect(address3)
        .acceptChallenge(0, { value: ethers.parseEther('2.0') })
      ).to.be
      .revertedWith('Desafio nao esta ativo ou ja foi aceito.');
    });

    it('Should fail if the challenger is the challenged', async () => {
      const { contract, address1 } = await loadFixture(createBetFixture);

      await expect(contract.connect(address1)
        .acceptChallenge(0, { value: ethers.parseEther('2.0') })
      ).to.be
      .revertedWith('Voce nao pode aceitar o proprio desafio.');
    });

    it('Should set the judge successfully', async () => {
      const { contract, address3 } = await loadFixture(acceptChallengeFixture);

      await expect(contract.connect(address3)
        .setJudge(0)
      ).to.emit(contract, 'JudgeDefined')
      .withArgs(address3.address);

      const challenge = await contract.bets(0);

      expect(challenge[2]).to.equal(address3.address);
    });

    it('Should fails if judge is the challenged', async () => {
      const { contract, address1 } = await loadFixture(acceptChallengeFixture);

      const challenge = await contract.bets(0);

      await expect(contract.connect(address1)
        .setJudge(0)
      ).to.be.rejectedWith('O desafiado nao pode ser o juiz.');

      expect(challenge[2]).to.equal(ethers.ZeroAddress);
    });

    it('Should fails if judge is the challenger', async () => {
      const { contract, address2 } = await loadFixture(acceptChallengeFixture);

      const challenge = await contract.bets(0);

      await expect(contract.connect(address2).setJudge(0))
        .to.be.rejectedWith('O desafiante nao pode ser o juiz.');

      expect(challenge[2]).to.equal(ethers.ZeroAddress);
    });

    it('Should fail if it already has a judge', async () => {
      const { contract, address3 } = await loadFixture(setJudgeFixture);

      const challenge = await contract.bets(0);
      
      await expect(contract.connect(address3).setJudge(0))
        .to.be.rejectedWith('Ja existe um juiz para esse desafio.');

      expect(challenge[2]).not.equal(ethers.ZeroAddress);
    });

    it('Should set the winner', async () => { 
      const { contract, owner, address1, address2, address3 } = await loadFixture(setJudgeFixture);

      const reward = Number(ethers.parseEther('4.0')) * 0.8;

      expect(await contract.connect(address3).setWinner(0, address1)).to.emit(contract, 'ChallengeWinner').withArgs(address1, reward);

      const challange = await contract.bets(0);
      expect(challange[7]).to.equal(address1.address);
      expect(challange[5]).to.equal(false);
      expect(challange[10]).to.not.equal(0);
    });

    it('Should fail if it\'s wrong judge', async () => {
      const { contract, address1, address2 } = await loadFixture(setJudgeFixture);

      await expect(contract.connect(address2).setWinner(0, address1))
      .to.be.rejectedWith('Somente o juiz pode declarar o vencedor.');
    });

    it('Should fail if the winner is neither the challenger nor the challenged', async () => {
      const { contract, address3, address4 } = await loadFixture(setJudgeFixture);

      await expect(contract.connect(address3).setWinner(0, address4))
      .to.be.rejectedWith('O vencedor deve ser o desafiado ou o desafiante.');
      
      await expect(contract.connect(address3).setWinner(0, address3))
      .to.be.rejectedWith('O vencedor deve ser o desafiado ou o desafiante.');
    });

    it('Should fail if the challange is inactive or opened', async () => {
      const { contract, address3, address1 } = await loadFixture(createBetFixture);

      await contract.connect(address3).setJudge(0);

      await expect(contract.connect(address3).setWinner(0, address1))
      .to.be.rejectedWith('Desafio nao esta ativo ou nao foi aceito');
    });

    it('Should create 30 chanlenges', async () => {
      const { contract, address1 } = await loadFixture(deployBettingFixture);

      setBalance(address1.address, ethers.parseEther("100000000"));

      contract.connect(address1);

      for (let i = 0; i < 30; i++) {
        await contract.createChallange({value: ethers.parseEther('1.0')});
      }

      const bets = await contract.getBetsResponse();

      expect(Number(bets[1])).to.equal(30)
    });
  });
});
