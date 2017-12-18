import Vue from 'vue';
import Vuex from 'vuex';
import { CoinFlip, StatVariance, RandomInRange } from '../lib/Helpers';
import { Critter, CritterFactory } from '../lib/Critter';

Vue.use(Vuex);

const queen = CritterFactory.default(1, 0, Critter.GENDER_FEMALE);
queen.rank = Critter.RANK_ROYAL;
const king = CritterFactory.default(2, 0, Critter.GENDER_MALE);
king.rank = Critter.RANK_ROYAL;

export const store = new Vuex.Store({
  state: {
    totalCritters: 2,
    totalGenerations: 0,
    totalSod: 0,
    royalHatchery: {
      boosts: 10,
      maxBoosts: 10,
      mother: {
        size: 1,
        sortBy: 'score',
        critters: [queen]
      },
      father: {
        size: 1,
        sortBy: 'score',
        critters: [king]
      },
      female: {
        size: 1,
        sortBy: 'score',
        critters: []
      },
      male: {
        size: 1,
        sortBy: 'score',
        critters: []
      }
    },
    worker: {
      mine: {
        sortBy: 'dirtPerSecond',
        productionPerSecond: 0,
        bonusPercent: 0,
        size: 1,
        critters: []
      },
      farm: {
        sortBy: 'grassPerSecond',
        productionPerSecond: 0,
        bonusPercent: 0,
        size: 1,
        critters: []
      },
      carry: {
        sortBy: 'carryPerSecond',
        productionPerSecond: 0,
        bonusPercent: 0,
        size: 1,
        critters: []
      },
      factory: {
        sortBy: 'sodPerSecond',
        productionPerSecond: 0,
        bonusPercent: 0,
        size: 1,
        critters: []
      }
    }
  },
  getters: {
    critters: state =>
      (location, owner) => {
        return state[location][owner].critters;
      },
    findCritter: state =>
      critterId => {
        const allCritters = state.royalHatchery.mother.critters
          .concat(state.royalHatchery.father.critters)
          .concat(state.royalHatchery.female.critters)
          .concat(state.royalHatchery.male.critters);
        return allCritters.find(critter => critterId === critter.id)
      },
    lowestMiner: state => {
      const slot = state.worker.mine;
      let result = 0;
      if (slot.critters.length > 0) {
        result = slot.critters[slot.critters.length-1].dirtPerSecond
      }
      return result;
    },
    lowestFarmer: state => {
      const slot = state.worker.farm;
      let result = 0;
      if (slot.critters.length > 0) {
        result = slot.critters[slot.critters.length-1].grassPerSecond
      }
      return result;
    },
    lowestCarrier: state => {
      const slot = state.worker.carry;
      let result = 0;
      if (slot.critters.length > 0) {
        result = slot.critters[slot.critters.length-1].carryPerSecond
      }
      return result;
    },
    lowestFactory: state => {
      const slot = state.worker.factory;
      let result = 0;
      if (slot.critters.length > 0) {
        result = slot.critters[slot.critters.length-1].sodPerSecond
      }
      return result;
    },
    productionPerSecond: state => {
      const production = [];
      for (let owner in state.worker) {
        if (state.worker.hasOwnProperty(owner)) {
          production.push({
            name: state.worker[owner].sortBy,
            productionPerSecond: state.worker[owner].productionPerSecond
          })
        }
      }
      return production;
    },
    boosts: state =>
      location => {
        return state[location].boosts;
      },
    maxBoosts: state =>
      location => {
        return state[location].maxBoosts;
      }
  },
  mutations: {
    breed(state, {mother, father, location}) {
      state.totalCritters++;
      const id = state.totalCritters;
      const generation = Math.max(mother.generation, father.generation) + 1;
      state.totalGenerations = Math.max(state.totalGenerations, generation);
      const child = CritterFactory.breed(id, mother, father);
      const slot = state[location][child.gender];
      slot.critters.push(child);
      slot.critters.sort((a, b) => b[slot.sortBy] - a[slot.sortBy]);
      if (slot.critters.length > slot.size) {
        slot.critters.pop()
      }
    },
    setCritterHealth(state, {critter, value}) {
      critter.currentHealth = value;
    },
    moveCritter(state, {from, to}) {
      const fromSlot = state[from.location][from.owner];
      const toSlot = state[to.location][to.owner];
      if (fromSlot.critters.length > 0) {
        if (toSlot.critters.length >= toSlot.size) {
          toSlot.critters.pop();
        }
        const critter = fromSlot.critters.shift();
        toSlot.critters.push(critter);
        toSlot.critters.sort((a,b) => b[toSlot.sortBy] - a[toSlot.sortBy])
      }
    },
    updateProduction(state) {
      for (let owner in state.worker) {
        if (state.worker.hasOwnProperty(owner)) {
          let value = state.worker[owner].critters.reduce((acc, critter) => {
            return acc + critter[state.worker[owner].sortBy];
          }, 0);
          value = value * (1 + state.worker[owner].bonusPercent/100);
          state.worker[owner].productionPerSecond = value;
        }
      }
    },
    setBoost(state, {location, value}) {
      state[location].boosts = value;
    }
  },
  actions: {
    healCritter: (context, critterId) => {
      const critter = context.getters.findCritter(critterId);
      const value = critter.currentHealth + critter.maxHealth / critter.actionTime;
      context.commit('setCritterHealth', {critter, value});

    },
    breedCritter: (context, location) => {
      const mother = context.getters.critters(location, 'mother')[0];
      const father = context.getters.critters(location, 'father')[0];
      context.commit('setCritterHealth', {critter: mother, value: 0});
      context.commit('setCritterHealth', {critter: father, value: 0});
      context.commit('breed', {mother, father, location});

    },
    replaceParent: (context, {location, owner}) => {
      const parent = (owner === Critter.GENDER_FEMALE) ? 'mother' : 'father';
      context.commit('moveCritter', {
        from: {location, owner},
        to: {location, owner: parent}
      });
    },
    addWorker: (context, {location, owner}) => {
      const slot = context.state[location][owner];
      const critter = slot.critters[0];
      if (critter) {
        const productions = [
          {
            owner: 'mine',
            canAdd: critter.dirtPerSecond>context.getters.lowestMiner || context.state.worker.mine.critters.length<context.state.worker.mine.size,
            production: context.state.worker.mine.productionPerSecond
          },{
            owner: 'farm',
            canAdd: critter.grassPerSecond>context.getters.lowestFarmer || context.state.worker.farm.critters.length<context.state.worker.farm.size,
            production: context.state.worker.farm.productionPerSecond
          }, {
            owner: 'carry',
            canAdd: critter.carryPerSecond>context.getters.lowestCarrier || context.state.worker.carry.critters.length<context.state.worker.carry.size,
            production: context.state.worker.carry.productionPerSecond
          }, {
            owner: 'factory',
            canAdd: critter.sodPerSecond>context.getters.lowestFactory || context.state.worker.factory.critters.length<context.state.worker.factory.size,
            production: context.state.worker.factory.productionPerSecond
          }
        ];
        productions.sort((a,b) => a.productionPerSecond - b.productionPerSecond);

        const production = productions.find(prod => prod.canAdd);
        if (production) {
          context.commit('moveCritter', {
            from: {location, owner},
            to: {location: 'worker', owner: production.owner}
          });

          context.commit('updateProduction')
        }
      }
    },
    useBoost: (context, location) => {
      const mother = context.getters.critters(location, 'mother')[0];
      const father = context.getters.critters(location, 'father')[0];
      context.commit('setCritterHealth', {critter: mother, value: 0});
      context.commit('setCritterHealth', {critter: father, value: 0});
      const value = context.getters.boosts(location) - 1;
      context.commit('setBoost', {location, value});
      context.commit('breed', {mother, father, location});
    },
    setBoost: (context, payload) => {
      context.commit('setBoost', payload)
    }
  }
});
