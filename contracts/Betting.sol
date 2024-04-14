// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ToString.sol";
import "hardhat/console.sol";

contract Betting {
    using ToString for uint256;
    address public owner;

    // Estrutura para representar um desafio
    struct Bet {
        address challenged;
        address challenger;
        address judge;
        uint256 betAmount;
        uint256 betBalance;
        bool active;
        bool accepted;
        address winner;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 finishedAt;
    }

    struct BetResponse {
        Bet[] bets;
        uint  total;
    }

    // Mapeia o endereço do desafiado para os desafios criados por ele
    Bet[] public bets;

    // Evento para notificar quando um desafio é criado
    event ChallengeCreated(address indexed challenged, uint256 betAmount);

    // Evento para notificar quando um desafio é aceito
    event ChallengeAccepted(address indexed challenger, uint indexed challengeId);

    // Evento para notificar quando um juiz é atribuído à um desafio
    event JudgeDefined(address indexed judge);

    // Evento para notificar vencedor do desafio
    event ChallengeWinner(address indexed winner, uint256 indexed reward);

    modifier validJudge(address _judge, uint _challenge) {
        require(_judge != bets[_challenge].challenged, "O desafiado nao pode ser o juiz.");
        require(_judge != bets[_challenge].challenger, "O desafiante nao pode ser o juiz.");
        require(bets[_challenge].judge == address(0), "Ja existe um juiz para esse desafio.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Função para criar um novo desafio
    function createChallange() external payable {
        address _challenged = msg.sender;

        // Cria o desafio
        Bet memory newChallenge = Bet({
            challenged: _challenged,
            challenger: address(0),
            judge: address(0),
            betAmount: msg.value,
            betBalance: msg.value,
            active: true,
            accepted: false,
            winner: address(0),
            createdAt: block.timestamp,
            acceptedAt: 0,
            finishedAt: 0
        });

        // Adiciona o desafio à lista do desafiado
        bets.push(newChallenge);

        // Emite o evento de criação do desafio
        emit ChallengeCreated(newChallenge.challenged, newChallenge.betAmount);
    }

    // Função para aceitar um desafio como desafiante
    function acceptChallenge(uint256 _challengeId) external payable {
        // Obtém o desafio da lista de desafios
        Bet storage challenge = bets[_challengeId];

        // Garante que o desafio esteja ativo e ainda não tenha sido aceito
        require(challenge.active && !challenge.accepted, "Desafio nao esta ativo ou ja foi aceito.");

        // Garante que o valor enviado seja igual ao valor da aposta
        require(msg.value == challenge.betAmount, "Valor enviado diferente do valor da aposta.");

        // Garante que o desafiante não seja o desafiado
        require(msg.sender != challenge.challenged, "Voce nao pode aceitar o proprio desafio.");

        // Define o desafiante como o chamador da função e marca o desafio como aceito
        challenge.challenger = msg.sender;
        challenge.betBalance += msg.value;
        challenge.accepted = true;
        challenge.acceptedAt = block.timestamp;

        emit ChallengeAccepted(challenge.challenger, _challengeId);
    }

    function setJudge(uint _challengeId) external validJudge(msg.sender, _challengeId) {
        require(bets[_challengeId].active, "O desafio precisa estar ativo.");

        Bet storage desafio = bets[_challengeId];
        desafio.judge = msg.sender;

        emit JudgeDefined(desafio.judge);
    }

    // Função para o juiz declarar o vencedor
    function setWinner(uint256 _challengeId, address _winner) external payable {
        // Obtém o desafio da lista do desafiado
        Bet storage desafio = bets[_challengeId];

        // Somente o juiz pode chamar esta função
        require(msg.sender == desafio.judge, "Somente o juiz pode declarar o vencedor.");

        // O vencedor deve ser o challanger ou o challenged
        require(_winner == desafio.challenger || _winner == desafio.challenged, "O vencedor deve ser o desafiado ou o desafiante.");

        // Garante que o desafio esteja ativo e tenha sido aceito
        require(desafio.active && desafio.accepted, "Desafio nao esta ativo ou nao foi aceito");

        // Define o vencedor
        desafio.winner = _winner;
        desafio.active = false;
        desafio.finishedAt = block.timestamp;

        // Calcula os pagamentos
        uint256 valorPremio = (desafio.betBalance * 8) / 10; // 80% para o vencedor
        uint256 taxaAdministrativa = desafio.betBalance / 10; // 10% para fins administrativos
        uint256 pagamentoJuiz = desafio.betBalance / 10; // 10% para o juiz

        require (pagamentoJuiz + valorPremio + taxaAdministrativa == desafio.betBalance, "Falha nos calculos dos premios, fale com um administrador.");

        // Transfere os pagamentos
        payable(_winner).transfer(valorPremio);
        payable(desafio.judge).transfer(pagamentoJuiz);
        payable(owner).transfer(taxaAdministrativa);

        emit ChallengeWinner(_winner, valorPremio);
    }

    function getDesafios() public view returns (Bet[] memory) {
        return bets;
    }
    
    function getBetsResponse() public view returns (BetResponse memory) {
        Bet[] memory _bets = new Bet[](20);
        uint _last;

        if (bets.length >= 20) {
            _last = 20;
        } else {
            _last = bets.length;
        }

        for (uint index = 0; index < _last; index++) {
            _bets[index] = bets[index];
        }

        return BetResponse({
            bets: _bets,
            total: bets.length
        });
    }

    function getBetsResponse(uint start) public view returns (BetResponse memory) {
        require(bets.length < start, unicode"Não há desafios suficientes.");

        Bet[] memory _bets = new Bet[](20);
        uint _last;

        if (bets.length + start > 20) {
            _last = 20;
        } else {
            _last = bets.length;
        }

        for (uint index = start; index < _last; index++) {
            _bets[index] = bets[index];
        }

        return BetResponse({
            bets: _bets,
            total: bets.length
        });
    }

    function getBetsByAddress(address wallet) public view returns (BetResponse memory) {
        uint256 betIndex = 0;

        Bet[] memory _betsByAddress;

        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].challenger == wallet || bets[i].challenged == wallet) {
                _betsByAddress[betIndex] = (bets[i]);
                betIndex++;
            }
        }

        return BetResponse({
            bets: _betsByAddress,
            total: _betsByAddress.length + 1
        });
    }

    function balance() public view returns (uint) {
        return address(this).balance;
    }
}
