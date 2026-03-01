// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_high_union_jack.sql';
import m0001 from './0001_living_the_santerians.sql';
import m0002 from './0002_worried_karma.sql';
import m0003 from './0003_lying_true_believers.sql';
import m0004 from './0004_ambiguous_toad_men.sql';
import m0005 from './0005_fair_squadron_supreme.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  
