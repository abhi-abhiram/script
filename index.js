const axios = require('axios');
const fs = require('fs');
const mongodb = require('mongodb');
require('dotenv').config();

const { MongoClient } = mongodb;

const client = new MongoClient(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const queryDate = async (epoch) => {
  try {
    return axios
      .post('https://gatewayde.dev.radixportfolio.info/validator', {
        network_identifier: {
          network: 'mainnet',
        },
        validator_identifier: {
          address:
            'rv1qvjz86qwa7l80y8vhfuhz6957ch6texdmpk98rg2gtakhr0avan4jplkxy7',
        },
        at_state_identifier: {
          epoch,
        },
      })
      .then(({ data }) => data.ledger_state.timestamp.split('T')[0]);
  } catch (error) {
    console.log('error in queryDate retrying in 1s');
    return new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
      queryDate(epoch)
    );
  }
};

const endEpoch = async () => {
  try {
    return axios
      .post('https://gatewayde.dev.radixportfolio.info/validator', {
        network_identifier: {
          network: 'mainnet',
        },
        validator_identifier: {
          address:
            'rv1qvjz86qwa7l80y8vhfuhz6957ch6texdmpk98rg2gtakhr0avan4jplkxy7',
        },
      })
      .then(({ data }) => data.ledger_state.epoch);
  } catch (error) {
    console.log('error in endEpoch retrying in 1s');
    return new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
      endEpoch()
    );
  }
};

async function epochStartEndDate(startEpoch) {
  const startDate = await queryDate(startEpoch);
  const initialEpoch = startEpoch;

  while (true) {
    const endDate = await queryDate(startEpoch + 1);
    if (new Date(startDate).getTime() === new Date(endDate).getTime()) {
      startEpoch++;
    } else {
      return {
        date: startDate,
        startEpoch: initialEpoch,
        endEpoch: startEpoch,
      };
    }
  }
}

async function main() {
  const epochs = [];
  const end = await endEpoch();
  for (let i = 1; i < end; i++) {
    const { date, endEpoch, startEpoch } = await epochStartEndDate(i);
    i = endEpoch;
    console.log(`For date ${date} epoch is ${startEpoch} - ${endEpoch}`);
    epochs.push({ date, startEpoch, endEpoch });
  }
  console.log('completed');
  // fs.writeFileSync('epochs.json', JSON.stringify(epochs, null, 2));
  await client.connect();
  const db = client.db('radix');
  const collection = db.collection('epochs');
  await collection.insertMany(epochs);
  await client.close();
}

main();
