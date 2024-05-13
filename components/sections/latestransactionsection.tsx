"use client";

/* eslint-disable @next/next/no-img-element */
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Chain } from "@/types/common";
import useTransactions from "@/hooks/useTransactions";
import { parseAvailAmount } from "@/utils/parseAmount";
import { ChainLabel } from "../ui/chainLabel";
import {
  parseDateTimeToMonthShort,
  parseDateTimeToDay,
} from "@/utils/parseDateTime";
import {
  ArrowUpRight,
  CheckCircle,
  ExternalLink,
  MoveRight,
} from "lucide-react";
import useClaim from "@/hooks/useClaim";
import { useEffect, useState } from "react";
import { showFailedMessage, showSuccessMessage } from "@/utils/common";
import { LoadingButton } from "../ui/loadingbutton";
import { useAvailAccount } from "@/stores/availWalletHook";
import { pollWithDelay } from "@/utils/poller";
import { appConfig } from "@/config/default";
import { Transaction } from "@/types/transaction";

export default function LatestTransactions(props: { pending: boolean }) {
  const { pendingTransactions, completedTransactions } = useTransactions();
  const { selected } = useAvailAccount();
  const { fetchTransactions } = useTransactions();
  const { initClaimAvailToEth, initClaimEthtoAvail } = useClaim();
  const [complete, setComplete] = useState<boolean[]>(
    Array(pendingTransactions.length).fill(false),
  );
  const [inProcess, setInProcess] = useState<boolean[]>(
    Array(pendingTransactions.length).fill(false),
  );

  const appInit = async () => {
    if (!selected) return;
    pollWithDelay(
      fetchTransactions,
      [
        {
          userAddress: selected.address,
        },
      ],
      appConfig.bridgeIndexerPollingInterval,
      () => true,
    );
  };

  useEffect(() => {
    appInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    setInProcess(Array(pendingTransactions.length).fill(false));
    setComplete(Array(pendingTransactions.length).fill(false));
  }, [pendingTransactions]);

  const onSubmit = async (
    chainFrom: Chain,
    blockhash: `0x${string}`,
    index: number,
    sourceTransactionIndex?: number,
    executeParams?: {
      messageid: number;
      amount: number;
      from: `${string}`;
      to: `${string}`;
      originDomain: number;
      destinationDomain: number;
    },
  ) => {
    setInProcess((prevState) =>
      prevState.map((state, idx) => (idx === index ? true : state)),
    );

    try {
      if (chainFrom === Chain.AVAIL && blockhash && sourceTransactionIndex) {
        console.log("Initiate ReceiveAvail()");
        const successBlockhash = await initClaimAvailToEth({
          blockhash: blockhash,
          sourceTransactionIndex: sourceTransactionIndex,
        });

        if (successBlockhash) {
          showSuccessMessage({
            blockhash: successBlockhash,
            chain: Chain.ETH,
          });
          setComplete((prevState) =>
            prevState.map((state, idx) => (idx === index ? true : state)),
          );
          console.log("Claimed AVAIL");
          console.log(complete, "complete index", index);
        } else {
          showFailedMessage();
        }
      } else if (chainFrom === Chain.ETH && blockhash && executeParams) {
        console.log("Initiate Vector.Execute");
        const successBlockhash = await initClaimEthtoAvail({
          blockhash: blockhash,
          executeParams: executeParams,
        });
        if (successBlockhash.blockhash) {
          showSuccessMessage({
            blockhash: successBlockhash.blockhash,
            chain: Chain.AVAIL,
          });
          setComplete((prevState) =>
            prevState.map((state, idx) => (idx === index ? true : state)),
          );
          console.log("Claimed AVAIL on AVAIL");
          console.log(complete, "complete index", index);
        } else {
          showFailedMessage();
        }

        setComplete((prevState) =>
          prevState.map((state, idx) => (idx === index ? true : state)),
        );
        console.log("Claimed AVAIL on ETH");
      } else {
        showFailedMessage();
      }
    } catch (e) {
      console.error(e);
      showFailedMessage();
    } finally {
      setInProcess((prevState) =>
        prevState.map((state, idx) => (idx === index ? false : state)),
      );
    }
  };

  function SubmitClaim({ txn, index }: { txn: Transaction; index: number }) {
    if (complete[index]) {
      return (
        <div className="flex flex-row items-center justify-center">
          <CheckCircle />
        </div>
      );
    }
    return (
      <>
        <LoadingButton
          key={index}
          variant="primary"
          loading={inProcess[index]}
          className="!px-4 !py-0"
          onClick={() =>
            onSubmit(
              txn.sourceChain,
              //@ts-ignore to be fixed later
              txn.sourceBlockHash,
              index,
              txn.sourceTransactionIndex,
              {
                messageid: txn.messageId,
                amount: txn.amount,
                from: txn.depositorAddress,
                to: txn.receiverAddress,
                originDomain: 1,
                destinationDomain: 2,
              },
            )
          }
        >
          {txn.status === "READY_TO_CLAIM" ? "CLAIM" : txn.status}
        </LoadingButton>
      </>
    );
  }

  function PendingTransactions() {
    return (
      <>
        <TableBody>
          {pendingTransactions
            .sort((a, b) => {
              return (
                new Date(b.sourceTransactionTimestamp).getTime() -
                new Date(a.sourceTransactionTimestamp).getTime()
              );
            })
            .map((txn, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium w-full flex flex-row space-x-2">
                  <p className="flex flex-col">
                    <p className="text-white text-opacity-60 flex flex-col items-center justify-center">
                      <p className="text-white text-md">
                        {parseDateTimeToDay(txn.sourceTransactionTimestamp)}
                      </p>
                      <p>
                        {parseDateTimeToMonthShort(
                          txn.sourceTransactionTimestamp,
                        )}
                      </p>
                    </p>
                  </p>
                  <p className="flex flex-col space-y-1 ">
                    <p className="flex flex-row w-full">
                      <ChainLabel chain={txn.sourceChain} />
                      <p className="px-1">
                        <MoveRight />
                      </p>{" "}
                      <ChainLabel chain={txn.destinationChain} />
                    </p>

                    <p className="flex flex-row space-x-2">
                      <p className="text-white text-opacity-60 text-xs ml-2">
                        {
                          //@ts-ignore look at this once @ankitboghra
                          parseAvailAmount(txn.amount)
                        }{" "}
                        AVAIL
                      </p>
                      <a
                        target="_blank"
                        href={
                          txn.sourceChain === Chain.ETH
                            ? `https://sepolia.etherscan.io/tx/${txn.sourceTransactionHash}`
                            : `https://avail-turing.subscan.io/extrinsic/${txn.sourceBlockHash}-${txn.sourceTransactionIndex}}`
                        }
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </p>

                  <br />
                </TableCell>
                <TableCell className="text-right items-end">
                  {txn.status === "READY_TO_CLAIM" ? (
                    <>
                      {/* <LoadingButton
                      key={index}
                      variant="primary"
                      loading={inProcess[index]}
                      className="!px-4 !py-0"
                      onClick={() =>
                        onSubmit(
                          txn.sourceChain,
                          //@ts-ignore to be fixed later
                          txn.sourceBlockHash,
                          index,
                          1,
                          {
                            messageid: txn.messageId,
                            amount: txn.amount,
                            from: txn.depositorAddress,
                            to: txn.receiverAddress,
                            originDomain: 1,
                            destinationDomain: 2,
                          }
                        )
                      }
                    >
                      {txn.status === "READY_TO_CLAIM" ? "CLAIM" : txn.status}
                    </LoadingButton> */}

                      <SubmitClaim txn={txn} index={index} />
                    </>
                  ) : (
                    <>
                      <Badge className=" flex flex-row items-center justify-center space-x-2">
                        <p>{txn.status}</p>
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                              txn.status === "INITIALIZED"
                                ? "bg-yellow-600"
                                : "bg-green-600"
                            } opacity-75`}
                          ></span>
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2  ${
                              txn.status === "INITIALIZED"
                                ? "bg-yellow-600"
                                : "bg-green-600"
                            }`}
                          ></span>
                        </span>
                      </Badge>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </>
    );
  }

  function CompletedTransactions() {
    return (
      <>
        <TableBody>
          {completedTransactions.map((txn, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium w-full flex flex-row space-x-2">
                <p className="flex flex-col">
                  <p className="text-white text-opacity-60 flex flex-col items-center justify-center">
                    <p className="text-white text-md">
                      {parseDateTimeToDay(txn.sourceTransactionTimestamp)}
                    </p>
                    <p>
                      {parseDateTimeToMonthShort(
                        txn.sourceTransactionTimestamp,
                      )}
                    </p>
                  </p>
                  {/* <p className="text-white text-opacity-60">{` ${new Date(
                        txn.sourceTransactionTimestamp
                      ).getHours()}${new Date(
                        txn.sourceTransactionTimestamp
                      ).getMinutes()}`}</p> */}
                </p>
                <p className="flex flex-col space-y-1 ">
                  <p className="flex flex-row w-full">
                    <ChainLabel chain={txn.sourceChain} />
                    <p className="px-1">
                      <MoveRight />
                    </p>{" "}
                    <ChainLabel chain={txn.destinationChain} />
                  </p>

                  <p className="flex flex-row space-x-2">
                    <p className="text-white text-opacity-60 text-xs ml-2">
                      {
                        //@ts-ignore look at this once @ankitboghra
                        parseAvailAmount(txn.amount)
                      }{" "}
                      AVAIL
                    </p>
                  </p>
                </p>
                <br />
              </TableCell>
              <TableCell className="text-right  items-end">
                <a
                  target="_blank"
                  href={
                    txn.sourceChain === Chain.AVAIL
                      ? `https://sepolia.etherscan.io/tx/${txn.destinationTransactionHash}`
                      : `https://avail-turing.subscan.io/extrinsic/${txn.destinationTransactionHash}`
                  }
                  className="flex flex-row !text-xs justify-end text-white text-opacity-75"
                >
                  View on Explorer <ArrowUpRight className="w-4 h-4" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>
    );
  }

  function NoTransactions() {
    return (
      <>
        <div className="flex flex-col items-center justify-center !h-[35vh] space-y-4">
          <img
            src="/images/notransactions.svg"
            alt="no transactions"
            className="text-opacity-80"
          ></img>
          <h2 className="font-ppmoribsemibold text-center w-[70%] mx-auto text-white text-opacity-90">
            You don&apos;t have any transactions with the connected accounts
          </h2>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl overflow-scroll-y max-h-[35vh]">
        <Table>
          {props.pending ? (
            pendingTransactions.length > 0 ? (
              <PendingTransactions />
            ) : (
              <NoTransactions />
            )
          ) : completedTransactions.length > 0 ? (
            <CompletedTransactions />
          ) : (
            <NoTransactions />
          )}
        </Table>
      </div>
    </div>
  );
}
