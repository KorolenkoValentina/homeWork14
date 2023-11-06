
enum CurrencyTypesEnum {
  USD = 'usd',
  EUR = 'eur',
  UAH = 'uah',
}

interface IBankClient {
  readonly firstName: string;
  readonly lastName: string;
}

interface ICurrencyConversionStrategy {
  convert(amount: number, currency: CurrencyTypesEnum): number;
}

interface IObserver {
  update(observable: IObservable): void;
}

interface IObservable {
  attach(observer: IObserver): void;
  detach(observer: IObserver): void;
  notify(): void;
}

class CurrentRateConversionStrategy implements ICurrencyConversionStrategy {
  constructor(private exchangeRates: Record<CurrencyTypesEnum, number>) {}

  public convert(amount: number, currency: CurrencyTypesEnum): number {
    const rate = this.exchangeRates[currency];

    if (!rate) throw new Error(`Exchange rate not available for currency ${currency}`);

    return amount * rate;
  }
}

class FixedRateConversionStrategy implements ICurrencyConversionStrategy {
  constructor(private fixedRate: number) {}

  public convert(amount: number, currency: CurrencyTypesEnum): number {
    return amount * this.fixedRate;
  }
}

abstract class Observable implements IObservable {
  protected observers: IObserver[] = [];

  public attach(observer: IObserver): void {
    const isExist = this.observers.includes(observer);
    if (!isExist) this.observers.push(observer);
  }

  public detach(observer: IObserver): void {
    const observerIndex = this.observers.indexOf(observer);

    if (~observerIndex) this.observers.splice(observerIndex, 1);
  }

  public notify(): void {
    for (const observer of this.observers) {
      observer.update(this);
    }
  }
}

interface ITransaction {
  execute(): void;
  rollback(): void;
}

class Transaction implements ITransaction {
  private initialBalance: number;
  private newBalance: number;
  private executed: boolean = false;
  private reverted: boolean = false;

  constructor(private account: BankAccount, private amount: number, private currency: CurrencyTypesEnum) {
    this.initialBalance = account.balance;
    this.newBalance = this.initialBalance;
  }

  public execute(): void {
    if (this.executed) {
      throw new Error('Transaction has already been executed.');
    }

    this.account.withdraw(this.amount, this.currency);
    this.newBalance = this.account.balance;
    this.executed = true;
  }

  public rollback(): void {
    if (!this.executed) {
      throw new Error('Cannot rollback a transaction that has not been executed.');
    }

    if (this.reverted) {
      throw new Error('Transaction has already been reverted.');
    }

    const amountToDeposit = this.initialBalance - this.newBalance;
    this.account.deposite(amountToDeposit);
    this.reverted = true;
  }
}


class BankAccount extends Observable {
  private readonly currency: CurrencyTypesEnum;
  private readonly _number: number;
  private _balance :number;
  private _holder: IBankClient;
  private _conversionStrategy: ICurrencyConversionStrategy;
  private transactionsQueue: ITransaction[] = [];

  constructor(client: IBankClient, currency: CurrencyTypesEnum, conversionStrategy: ICurrencyConversionStrategy,initialBalance: number = 0) {
    super();
    this.currency = currency;
    this._holder = client;
    this._number = 1234343;
    this._conversionStrategy = conversionStrategy;
    this._balance = initialBalance;
  }

  public get number(): number {
    return this._number;
  }

  public get balance(): number {
    return this._balance;
  }

  public set conversionStrategy(strategy: ICurrencyConversionStrategy) {
    this._conversionStrategy = strategy;
  }

  public holder(): IBankClient {
    return this._holder;
  }

  public deposite(amount: number): void {
    this._balance += amount;
    this.notify();
  }

  public withdraw(amount: number, currency: CurrencyTypesEnum): void {
    const convertedAmount = this._conversionStrategy.convert(amount, currency);

    if (this._balance < convertedAmount) {
      throw new Error('Insufficient funds');
    }

    this._balance -= convertedAmount;
    this.notify();
  }

  notify() {
    for (const observer of this.observers) {
      observer.update(this);
    }
  }
  public queueTransaction(transaction: ITransaction): void {
    this.transactionsQueue.push(transaction);
  }

  public executeTransactions(): void {
    this.transactionsQueue.forEach(transaction => {
      transaction.execute();
    });
    this.transactionsQueue = [];
  }

  public rollbackTransactions(): void {
    while (this.transactionsQueue.length > 0) {
      const transaction = this.transactionsQueue.pop();
      if (transaction) {
        transaction.rollback();
      }
    }
  }
}

class Bank {
  private accounts: Map<IBankClient, BankAccount[]> = new Map();
  private static instance: Bank;

  private constructor() {}

  public static getInstance(): Bank {
    if (!Bank.instance) {
      Bank.instance = new Bank();
    }
    return Bank.instance;
  }

  public createAccount(client: IBankClient, currency: CurrencyTypesEnum, conversionStrategy: ICurrencyConversionStrategy, initialBalance: number = 0): BankAccount {
    let accounts = this.accounts.get(client);

    if (!accounts) {
      accounts = [];
      this.accounts.set(client, accounts);
    }

    const account = new BankAccount(client, currency, conversionStrategy,initialBalance);
    accounts.push(account);

    return account;
  }

  public closeAccount(account: BankAccount): void {
    for (const accounts of this.accounts.values()) {
      const index = accounts.indexOf(account);
      if (index !== -1) {
        accounts.splice(index, 1);
        return;
      }
    }
    throw new Error('Account not found in the bank');
  }

  public queueTransaction(account: BankAccount, transaction: ITransaction): void {
    account.queueTransaction(transaction);
  }

  public executeQueuedTransactions(account: BankAccount): void {
    account.executeTransactions();
  }

  public rollbackQueuedTransactions(account: BankAccount): void {
    account.rollbackTransactions();
  }
}

class SMSNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`SMS notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

class EmailNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`Email notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

class PushNotification implements IObserver {
  update(account: BankAccount): void {
    console.log(`Push notification: Your account balance has chenged. Current balance: ${account.balance}`);
  }
}

// Привідний код для використання функціоналу банку

const exchangeRates = {
  [CurrencyTypesEnum.USD]: 1.1,
  [CurrencyTypesEnum.EUR]: 0.9,
  [CurrencyTypesEnum.UAH]: 38,
};


const bank = Bank.getInstance();

const currentRateStrategy = new CurrentRateConversionStrategy(exchangeRates);
const fixedRateStrategy = new FixedRateConversionStrategy(0.5);

const account = new BankAccount({ firstName: 'John', lastName: 'Doe' }, CurrencyTypesEnum.USD, currentRateStrategy, 1000);
const account2 = new BankAccount({ firstName: 'John', lastName: 'Doe' }, CurrencyTypesEnum.EUR, currentRateStrategy, 800);

// Додавання транзакцій до черги
bank.queueTransaction(account, new Transaction(account, 500, CurrencyTypesEnum.USD));
bank.queueTransaction(account2, new Transaction(account2, 300, CurrencyTypesEnum.EUR));


// Виконання транзакцій для всіх рахунків клієнта
bank.executeQueuedTransactions(account);
bank.executeQueuedTransactions(account2);

// Створення нової транзакції та її відміна
const newTransaction = new Transaction(account, 200, CurrencyTypesEnum.USD);
bank.queueTransaction(account, newTransaction);
bank.executeQueuedTransactions(account);
bank.rollbackQueuedTransactions(account);

// Закриття банківського рахунку
bank.closeAccount(account);

// Отримання поточного балансу рахунків та виведення інформації про них
console.log(`Current balance of account 1: ${account.balance}`);
console.log(`Current balance of account 2: ${account2.balance}`);


// Приклад роботи з оповіщеннями:

const smsNotificaton = new SMSNotification();
const emailNotificaton = new EmailNotification();
const pushNotificaton = new PushNotification();

account.attach(smsNotificaton);
account.attach(emailNotificaton);
account.attach(pushNotificaton);

account.deposite(1000);

account.detach(emailNotificaton);
account.detach(pushNotificaton);

account.conversionStrategy = fixedRateStrategy;
account.withdraw(100, CurrencyTypesEnum.UAH);
