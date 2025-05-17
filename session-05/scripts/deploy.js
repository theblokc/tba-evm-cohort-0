const {ethers} = require("hardhat");

async function main(){
    const [deployer] = await ethers.getSigners();
    const myContract = await ethers.getContractFactory("PublicNotepad");
    const MyContract = await myContract.deploy();

    console.log("Contract deployed to address:", MyContract.target);
    console.log("Deployed by:", deployer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});