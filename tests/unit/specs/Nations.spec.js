import {createLocalVue, shallowMount, mount} from "@vue/test-utils";
import BootstrapVue from "bootstrap-vue";
import Vuex from "vuex";
import sinon from 'sinon';
import Nation from '../../../src/lib/Nation';
import Nations from '../../../src/components/Nations';

const localVue = createLocalVue();
localVue.use(BootstrapVue);
localVue.use(Vuex);

describe('The Nations View', () => {
  const cricketNation = Nation.CRICKETS;
  const beeNation = Nation.BEES;
  const unlockedNations = [cricketNation];
  const allNations = [cricketNation, beeNation];
  let store;

  beforeEach(() => {
    sinon.stub(Nation, 'allNations').returns(allNations);
    store = new Vuex.Store({
      getters: {
        isNationUnlocked: () => {
          return nationId => !!unlockedNations.find(n => n.id === nationId)
        }
      }
    });
    sinon.stub(store, 'dispatch');
  });

  it('should display information for each nation', () => {
    const nationsViewWrapper = shallowMount(Nations, {store, localVue});

    const cricketNationWrapper = nationsViewWrapper.find(`#nation-${cricketNation.id}`);
    expect(cricketNationWrapper.text()).to.equal(`${cricketNation.custom} ${cricketNation.minBaseVal} - ${cricketNation.maxBaseVal}`);
    expect(cricketNationWrapper.attributes('title')).to.equal(cricketNation.name);

    const beeNationWrapper = nationsViewWrapper.find(`#nation-${beeNation.id}`);
    expect(beeNationWrapper.text()).to.equal(`${beeNation.custom} ${beeNation.minBaseVal} - ${beeNation.maxBaseVal}`);
    expect(beeNationWrapper.attributes('title')).to.equal(beeNation.name);
  });

  it('should show different bg and text variants for locked and unlocked nations', () => {
    const nationsViewWrapper = shallowMount(Nations, {store, localVue});
    const cricketNationWrapper = nationsViewWrapper.find(`#nation-${cricketNation.id}`);
    const beeNationWrapper = nationsViewWrapper.find(`#nation-${beeNation.id}`);

    expect(cricketNationWrapper.attributes('bgvariant')).to.equal('secondary');
    expect(cricketNationWrapper.attributes('textvariant')).to.equal('white');
    expect(beeNationWrapper.attributes('bgvariant')).to.equal('light');
    expect(beeNationWrapper.attributes('textvariant')).to.equal('black');
  });

  it('should start war', () => {
    const nationsViewWrapper = mount(Nations, {store, localVue});
    const cricketNationWrapper = nationsViewWrapper.find(`#nation-${cricketNation.id}`);

    cricketNationWrapper.trigger('click');

    expect(store.dispatch).to.have.been.calledWith('startWar', cricketNation.id);
  });

  it('should not start war if nation is not unlocked', () => {
    const nationsViewWrapper = mount(Nations, {store, localVue});
    const beeNationWrapper = nationsViewWrapper.find(`#nation-${beeNation.id}`);

    beeNationWrapper.trigger('click');

    expect(store.dispatch).not.to.have.been.calledWith('startWar', beeNation.id);
  });

  afterEach(() => {
    Nation.allNations.restore();
  })
});