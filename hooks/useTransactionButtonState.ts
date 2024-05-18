import { useAvailAccount } from "@/stores/availWalletHook";
import { useCommonStore } from "@/stores/common";
import { Chain } from "@/types/common";
import { useMemo } from "react";
import { useAccount } from "wagmi";

export default function useTransactionButtonState(
  ethBalance: string | undefined | null,
  availBalance: string | undefined | null,
  transactionInProgress: boolean
) {

  const account = useAccount();

  const {selected} = useAvailAccount();
  const {fromChain, fromAmount, toAddress} = useCommonStore();

  const isWalletConnected = useMemo(() => {
    if(fromChain === Chain.ETH) {
      return account?.address && true
    } 
    if(fromChain === Chain.AVAIL) {
      return selected?.address && true
    }
  }, [account.address, selected?.address, fromChain]);

  const isInvalidAmount = useMemo(() => {
    const amount = parseFloat(fromAmount?.toString());
    return (
      fromAmount === undefined ||
      fromAmount === null ||
      isNaN(amount) ||
      amount <= 0
    );
  }, [fromAmount]);

  const isInvalidToAddress = useMemo(()=>{
    if(toAddress !== undefined && toAddress !== "") {
      return false
    } else {
      return true
    }
  },[toAddress])

  const hasInsufficientBalance = useMemo(() => {
    if (!fromAmount || isNaN(fromAmount)) return false;
    
    const amount = parseFloat(fromAmount?.toString()) * 10**18;
    if (isNaN(amount)) return false;
  
    const balanceMap = {
      [Chain.ETH]: ethBalance,
      [Chain.AVAIL]: availBalance
    }
  
    const currentBalance = balanceMap[fromChain];
    if (currentBalance === undefined || currentBalance === null) return false;
  
    return parseFloat(currentBalance) < amount;
  }, [ethBalance, availBalance, fromAmount, fromChain]);

  const buttonStatus = useMemo(() => {
    if (!isWalletConnected) {
      return "Connect Wallet";
    }
    if (transactionInProgress) {
      return "Transaction in progress";
    }
    if (isInvalidAmount) {
      return "Enter Amount";
    }
    if (hasInsufficientBalance) {
      return "Insufficient Balance";
    }
    return "Initiate Transaction";
  }, [transactionInProgress, isInvalidAmount, hasInsufficientBalance, isWalletConnected]);

  const isDisabled = useMemo(() => {
    return transactionInProgress || isInvalidAmount || hasInsufficientBalance || !isWalletConnected;
  }, [transactionInProgress, isInvalidAmount, hasInsufficientBalance, isWalletConnected]);

  return { buttonStatus, isDisabled };
}
