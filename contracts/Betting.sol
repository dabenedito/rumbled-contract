// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ToString.sol";
import "hardhat/console.sol";

contract Betting {
    using ToString for uint256;
    address public owner;

    // Estrutura para representar um desafio
    struct Bets {
        address challenged;
        address challenger;
        address judge;
        uint256 betAmount;
        bool active;
        bool accepted;
        address winner;
    }

    // Mapeia o endereço do desafiado para os desafios criados por ele
    Bets[] public bets;

    // Evento para notificar quando um desafio é criado
    event ChallengeCreated(address indexed challenged, uint256 betAmount);

    // Evento para notificar quando um desafio é aceito
    event ChallengeAccepted(address indexed challenger, uint indexed challengeId);

    // Evento para notificar quando um juiz é atribuído à um desafio
    event JudgeDefined(address indexed judge);

    modifier validJudge(address _judge, uint _challenge) {
        require(_judge != bets[_challenge].challenged, "O desafiado nao pode ser o juiz.");
        require(_judge != bets[_challenge].challenger, "O desafiante nao pode ser o juiz.");
        require(bets[_challenge].judge == address(0), "Ja existe um juiz para esse desafio");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Função para criar um novo desafio
    function createChallange() external payable {
        address _challenged = msg.sender;

        // Cria o desafio
        Bets memory newChallenge = Bets({
            challenged: _challenged,
            challenger: address(0),
            judge: address(0),
            betAmount: msg.value,
            active: true,
            accepted: false,
            winner: address(0)
        });

        // Adiciona o desafio à lista do desafiado
        bets.push(newChallenge);

        // Emite o evento de criação do desafio
        emit ChallengeCreated(newChallenge.challenged, newChallenge.betAmount);
    }

    // Função para aceitar um desafio como desafiante
    function acceptChallenge(uint256 _challengeId) external payable {
        // Obtém o desafio da lista de desafios
        Bets storage challenge = bets[_challengeId];

        // Garante que o desafio esteja ativo e ainda não tenha sido aceito
        require(challenge.active && !challenge.accepted, "Desafio nao esta ativo ou ja foi aceito.");

        // Garante que o valor enviado seja igual ao valor da aposta
        require(msg.value == challenge.betAmount, "Valor enviado diferente do valor da aposta.");

        // Garante que o desafiante não seja o desafiado
        require(msg.sender != challenge.challenged, "Voce nao pode aceitar o proprio desafio.");

        // Define o desafiante como o chamador da função e marca o desafio como aceito
        challenge.challenger = msg.sender;
        challenge.accepted = true;

        emit ChallengeAccepted(challenge.challenger, _challengeId);
    }

    function setJudge(uint _challengeId) external validJudge(msg.sender, _challengeId) {
        require(bets[_challengeId].active, "O desafio precisa estar ativo.");

        Bets storage desafio = bets[_challengeId];
        desafio.judge = msg.sender;

        emit JudgeDefined(desafio.judge);
    }

    // Função para o juiz declarar o vencedor
    function setWinner(uint256 _challengeId, address _winner) external payable {
        // Somente o juiz pode chamar esta função
        require(msg.sender == bets[_challengeId].judge, "Somente o juiz pode declarar o vencedor");

        // Obtém o desafio da lista do desafiado
        Bets storage desafio = bets[_challengeId];

        // Garante que o desafio esteja ativo e tenha sido aceito
        require(desafio.active && desafio.accepted, "Desafio nao esta ativo ou nao foi aceito");

        // Define o vencedor
        desafio.winner = _winner;
        desafio.active = false;

        // Calcula os pagamentos
        uint256 valorPremio = (desafio.betAmount * 8) / 10; // 80% para o vencedor
        uint256 taxaAdministrativa = (desafio.betAmount * 1) / 10; // 10% para fins administrativos
        uint256 pagamentoJuiz = (desafio.betAmount * 1) / 10; // 10% para o juiz

        // Transfere os pagamentos
        payable(_winner).transfer(valorPremio);
        payable(desafio.judge).transfer(pagamentoJuiz);
        payable(owner).transfer(taxaAdministrativa);
    }

    function getDesafios() public view returns (Bets[] memory) {
        return bets;
    }

    function balance() public view returns (uint) {
        return address(this).balance;
    }
}
