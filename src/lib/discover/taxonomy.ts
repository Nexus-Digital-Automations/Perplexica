export interface LeafTopic {
  key: string;
  display: string;
  searchQueries: string[];
  searchSites: string[];
}

export interface SubCategory {
  key: string;
  display: string;
  children: LeafTopic[];
}

export interface TopCategory {
  key: string;
  display: string;
  icon: string;
  children: SubCategory[];
}

export const TAXONOMY: TopCategory[] = [
  {
    key: 'technology',
    display: 'Technology',
    icon: '💻',
    children: [
      {
        key: 'technology.ai',
        display: 'AI & Machine Learning',
        children: [
          {
            key: 'technology.ai.ml',
            display: 'Machine Learning',
            searchQueries: ['machine learning news', 'deep learning research', 'neural networks'],
            searchSites: ['arxiv.org', 'venturebeat.com', 'techcrunch.com'],
          },
          {
            key: 'technology.ai.nlp',
            display: 'Natural Language Processing',
            searchQueries: ['NLP news', 'large language models', 'GPT AI text'],
            searchSites: ['huggingface.co', 'arxiv.org', 'techcrunch.com'],
          },
          {
            key: 'technology.ai.vision',
            display: 'Computer Vision',
            searchQueries: ['computer vision news', 'image recognition AI', 'visual AI'],
            searchSites: ['arxiv.org', 'venturebeat.com', 'theverge.com'],
          },
          {
            key: 'technology.ai.robotics',
            display: 'Robotics',
            searchQueries: ['robotics news', 'robot technology', 'autonomous robots'],
            searchSites: ['ieee.org', 'techcrunch.com', 'wired.com'],
          },
          {
            key: 'technology.ai.ethics',
            display: 'AI Ethics',
            searchQueries: ['AI ethics', 'responsible AI', 'AI bias regulation'],
            searchSites: ['wired.com', 'technologyreview.com', 'theguardian.com'],
          },
        ],
      },
      {
        key: 'technology.software',
        display: 'Software Development',
        children: [
          {
            key: 'technology.software.web',
            display: 'Web Development',
            searchQueries: ['web development news', 'JavaScript frameworks', 'frontend backend'],
            searchSites: ['dev.to', 'smashingmagazine.com', 'css-tricks.com'],
          },
          {
            key: 'technology.software.mobile',
            display: 'Mobile Development',
            searchQueries: ['mobile app development', 'iOS Android news', 'React Native Flutter'],
            searchSites: ['developer.apple.com', 'android-developers.googleblog.com', 'techcrunch.com'],
          },
          {
            key: 'technology.software.opensource',
            display: 'Open Source',
            searchQueries: ['open source news', 'GitHub projects', 'Linux open source'],
            searchSites: ['github.blog', 'opensource.com', 'lwn.net'],
          },
          {
            key: 'technology.software.devops',
            display: 'DevOps & Cloud',
            searchQueries: ['DevOps news', 'cloud computing AWS Azure', 'Kubernetes Docker'],
            searchSites: ['thenewstack.io', 'devops.com', 'infoq.com'],
          },
        ],
      },
      {
        key: 'technology.hardware',
        display: 'Hardware',
        children: [
          {
            key: 'technology.hardware.consumer',
            display: 'Consumer Electronics',
            searchQueries: ['consumer electronics news', 'gadgets tech', 'new tech products'],
            searchSites: ['theverge.com', 'engadget.com', 'cnet.com'],
          },
          {
            key: 'technology.hardware.smartphones',
            display: 'Smartphones',
            searchQueries: ['smartphone news', 'iPhone Android phones', 'mobile phone reviews'],
            searchSites: ['gsmarena.com', 'theverge.com', 'androidcentral.com'],
          },
          {
            key: 'technology.hardware.chips',
            display: 'Semiconductors',
            searchQueries: ['semiconductor news', 'chip technology', 'NVIDIA Intel AMD'],
            searchSites: ['anandtech.com', 'semianalysis.com', 'techcrunch.com'],
          },
          {
            key: 'technology.hardware.wearables',
            display: 'Wearables',
            searchQueries: ['wearable tech news', 'smartwatch fitness tracker', 'AR VR headsets'],
            searchSites: ['wareable.com', 'theverge.com', 'engadget.com'],
          },
        ],
      },
      {
        key: 'technology.security',
        display: 'Cybersecurity',
        children: [
          {
            key: 'technology.security.privacy',
            display: 'Data Privacy',
            searchQueries: ['data privacy news', 'GDPR privacy regulations', 'personal data'],
            searchSites: ['privacynews.com', 'wired.com', 'techcrunch.com'],
          },
          {
            key: 'technology.security.hacking',
            display: 'Hacking & Exploits',
            searchQueries: ['cybersecurity breach', 'hacking news', 'vulnerability exploit'],
            searchSites: ['krebsonsecurity.com', 'therecord.media', 'bleepingcomputer.com'],
          },
          {
            key: 'technology.security.enterprise',
            display: 'Enterprise Security',
            searchQueries: ['enterprise security news', 'zero trust security', 'SOC threat intelligence'],
            searchSites: ['darkreading.com', 'securityweek.com', 'helpnetsecurity.com'],
          },
        ],
      },
    ],
  },
  {
    key: 'finance',
    display: 'Finance',
    icon: '💰',
    children: [
      {
        key: 'finance.markets',
        display: 'Markets',
        children: [
          {
            key: 'finance.markets.stocks',
            display: 'Stock Market',
            searchQueries: ['stock market news', 'equities investing', 'S&P 500 Nasdaq'],
            searchSites: ['bloomberg.com', 'marketwatch.com', 'cnbc.com'],
          },
          {
            key: 'finance.markets.crypto',
            display: 'Cryptocurrency',
            searchQueries: ['cryptocurrency news', 'Bitcoin Ethereum crypto', 'DeFi blockchain'],
            searchSites: ['coindesk.com', 'cointelegraph.com', 'decrypt.co'],
          },
          {
            key: 'finance.markets.commodities',
            display: 'Commodities',
            searchQueries: ['commodities news', 'oil gold prices', 'raw materials markets'],
            searchSites: ['bloomberg.com', 'reuters.com', 'oilprice.com'],
          },
          {
            key: 'finance.markets.forex',
            display: 'Foreign Exchange',
            searchQueries: ['forex news', 'currency exchange rates', 'USD EUR GBP'],
            searchSites: ['forexlive.com', 'bloomberg.com', 'reuters.com'],
          },
        ],
      },
      {
        key: 'finance.economics',
        display: 'Economics',
        children: [
          {
            key: 'finance.economics.macro',
            display: 'Macroeconomics',
            searchQueries: ['macroeconomics news', 'GDP inflation economic growth', 'global economy'],
            searchSites: ['economist.com', 'ft.com', 'bloomberg.com'],
          },
          {
            key: 'finance.economics.banking',
            display: 'Central Banking',
            searchQueries: ['Federal Reserve interest rates', 'central bank policy', 'ECB monetary policy'],
            searchSites: ['federalreserve.gov', 'wsj.com', 'reuters.com'],
          },
          {
            key: 'finance.economics.trade',
            display: 'Trade & Tariffs',
            searchQueries: ['trade news', 'tariffs trade war', 'global supply chain'],
            searchSites: ['reuters.com', 'bloomberg.com', 'ft.com'],
          },
        ],
      },
      {
        key: 'finance.business',
        display: 'Business',
        children: [
          {
            key: 'finance.business.startups',
            display: 'Startups & VC',
            searchQueries: ['startup news', 'venture capital funding', 'tech IPO'],
            searchSites: ['techcrunch.com', 'venturebeat.com', 'crunchbase.com'],
          },
          {
            key: 'finance.business.ma',
            display: 'Mergers & Acquisitions',
            searchQueries: ['merger acquisition news', 'M&A deals', 'corporate buyout'],
            searchSites: ['reuters.com', 'bloomberg.com', 'wsj.com'],
          },
          {
            key: 'finance.business.earnings',
            display: 'Earnings & Results',
            searchQueries: ['company earnings results', 'quarterly earnings', 'corporate profits'],
            searchSites: ['cnbc.com', 'marketwatch.com', 'seekingalpha.com'],
          },
        ],
      },
      {
        key: 'finance.personal',
        display: 'Personal Finance',
        children: [
          {
            key: 'finance.personal.investing',
            display: 'Investing',
            searchQueries: ['personal investing tips', 'index funds ETF investing', 'portfolio management'],
            searchSites: ['investopedia.com', 'nerdwallet.com', 'morningstar.com'],
          },
          {
            key: 'finance.personal.realestate',
            display: 'Real Estate',
            searchQueries: ['real estate news', 'housing market', 'mortgage rates property'],
            searchSites: ['realtor.com', 'zillow.com', 'housingwire.com'],
          },
          {
            key: 'finance.personal.retirement',
            display: 'Retirement Planning',
            searchQueries: ['retirement planning news', '401k IRA pension', 'retirement savings'],
            searchSites: ['kiplinger.com', 'investopedia.com', 'marketwatch.com'],
          },
        ],
      },
    ],
  },
  {
    key: 'science',
    display: 'Science & Health',
    icon: '🔬',
    children: [
      {
        key: 'science.space',
        display: 'Space & Astronomy',
        children: [
          {
            key: 'science.space.exploration',
            display: 'Space Exploration',
            searchQueries: ['space exploration news', 'NASA SpaceX missions', 'rocket launch'],
            searchSites: ['nasa.gov', 'spacenews.com', 'space.com'],
          },
          {
            key: 'science.space.astronomy',
            display: 'Astronomy',
            searchQueries: ['astronomy news', 'telescope discoveries', 'galaxies stars planets'],
            searchSites: ['skyandtelescope.org', 'astronomy.com', 'space.com'],
          },
        ],
      },
      {
        key: 'science.physics',
        display: 'Physics',
        children: [
          {
            key: 'science.physics.quantum',
            display: 'Quantum Computing',
            searchQueries: ['quantum computing news', 'quantum physics breakthrough', 'qubits quantum'],
            searchSites: ['quantamagazine.org', 'sciencenews.org', 'phys.org'],
          },
          {
            key: 'science.physics.particle',
            display: 'Particle Physics',
            searchQueries: ['particle physics news', 'CERN LHC discoveries', 'fundamental particles'],
            searchSites: ['cerncourier.com', 'physicsworld.com', 'quantamagazine.org'],
          },
        ],
      },
      {
        key: 'science.biology',
        display: 'Biology & Genetics',
        children: [
          {
            key: 'science.biology.genetics',
            display: 'Genetics',
            searchQueries: ['genetics news', 'CRISPR gene editing', 'DNA genomics'],
            searchSites: ['nature.com', 'sciencenews.org', 'geneticsandsociety.org'],
          },
          {
            key: 'science.biology.evolution',
            display: 'Evolution & Paleontology',
            searchQueries: ['evolution news', 'fossil discovery paleontology', 'human origins'],
            searchSites: ['sciencenews.org', 'nature.com', 'smithsonianmag.com'],
          },
        ],
      },
      {
        key: 'science.environment',
        display: 'Environment',
        children: [
          {
            key: 'science.environment.climate',
            display: 'Climate Change',
            searchQueries: ['climate change news', 'global warming carbon emissions', 'climate policy'],
            searchSites: ['carbonbrief.org', 'climatecentral.org', 'theguardian.com'],
          },
          {
            key: 'science.environment.sustainability',
            display: 'Sustainability',
            searchQueries: ['sustainability news', 'renewable energy green tech', 'clean energy'],
            searchSites: ['greenbiz.com', 'cleantechnica.com', 'renewable-technology.com'],
          },
          {
            key: 'science.environment.wildlife',
            display: 'Wildlife & Conservation',
            searchQueries: ['wildlife conservation news', 'endangered species', 'biodiversity'],
            searchSites: ['nationalgeographic.com', 'wwf.org', 'theguardian.com'],
          },
        ],
      },
      {
        key: 'science.health',
        display: 'Health & Medicine',
        children: [
          {
            key: 'science.health.nutrition',
            display: 'Nutrition & Diet',
            searchQueries: ['nutrition news', 'diet health food science', 'dietary research'],
            searchSites: ['healthline.com', 'nutritionsource.hsph.harvard.edu', 'sciencedaily.com'],
          },
          {
            key: 'science.health.mental',
            display: 'Mental Health',
            searchQueries: ['mental health news', 'psychology wellbeing', 'anxiety depression treatment'],
            searchSites: ['psychologytoday.com', 'mentalhealthamerica.net', 'apa.org'],
          },
          {
            key: 'science.health.research',
            display: 'Medical Research',
            searchQueries: ['medical research news', 'clinical trials drug discovery', 'pharma health'],
            searchSites: ['statnews.com', 'medscape.com', 'nejm.org'],
          },
        ],
      },
    ],
  },
  {
    key: 'arts',
    display: 'Arts & Culture',
    icon: '🎨',
    children: [
      {
        key: 'arts.visual',
        display: 'Visual Arts',
        children: [
          {
            key: 'arts.visual.contemporary',
            display: 'Contemporary Art',
            searchQueries: ['contemporary art news', 'modern art exhibitions', 'art galleries'],
            searchSites: ['artnews.com', 'artforum.com', 'hyperallergic.com'],
          },
          {
            key: 'arts.visual.photography',
            display: 'Photography',
            searchQueries: ['photography news', 'photo awards exhibitions', 'photojournalism'],
            searchSites: ['petapixel.com', 'lensculture.com', 'aperture.org'],
          },
        ],
      },
      {
        key: 'arts.music',
        display: 'Music',
        children: [
          {
            key: 'arts.music.pop',
            display: 'Pop & Rock',
            searchQueries: ['pop music news', 'rock music', 'album releases charts'],
            searchSites: ['pitchfork.com', 'rollingstone.com', 'nme.com'],
          },
          {
            key: 'arts.music.classical',
            display: 'Classical',
            searchQueries: ['classical music news', 'orchestra opera concerts', 'symphony'],
            searchSites: ['gramophone.co.uk', 'classicfm.com', 'bachtrack.com'],
          },
          {
            key: 'arts.music.electronic',
            display: 'Electronic',
            searchQueries: ['electronic music news', 'EDM techno house music', 'DJ producers'],
            searchSites: ['residentadvisor.net', 'xlr8r.com', 'factmag.com'],
          },
          {
            key: 'arts.music.hiphop',
            display: 'Hip Hop & R&B',
            searchQueries: ['hip hop news', 'rap music', 'R&B new releases'],
            searchSites: ['pitchfork.com', 'hotnewhiphop.com', 'rollingstone.com'],
          },
        ],
      },
      {
        key: 'arts.film',
        display: 'Film & TV',
        children: [
          {
            key: 'arts.film.movies',
            display: 'Movies',
            searchQueries: ['movie news', 'film reviews box office', 'Hollywood cinema'],
            searchSites: ['variety.com', 'hollywoodreporter.com', 'indiewire.com'],
          },
          {
            key: 'arts.film.streaming',
            display: 'Streaming',
            searchQueries: ['streaming shows news', 'Netflix HBO Disney Plus', 'TV series'],
            searchSites: ['variety.com', 'deadline.com', 'theverge.com'],
          },
          {
            key: 'arts.film.documentary',
            display: 'Documentaries',
            searchQueries: ['documentary news', 'new documentaries', 'documentary film festival'],
            searchSites: ['docnyc.net', 'documentarymagazine.com', 'indiewire.com'],
          },
        ],
      },
      {
        key: 'arts.literature',
        display: 'Literature',
        children: [
          {
            key: 'arts.literature.fiction',
            display: 'Fiction',
            searchQueries: ['fiction books news', 'novel releases literary fiction', 'book awards'],
            searchSites: ['theguardian.com', 'newyorker.com', 'lithub.com'],
          },
          {
            key: 'arts.literature.nonfiction',
            display: 'Non-Fiction',
            searchQueries: ['nonfiction book news', 'biography memoir', 'best nonfiction books'],
            searchSites: ['nytimes.com', 'theatlantic.com', 'bookforum.com'],
          },
        ],
      },
      {
        key: 'arts.design',
        display: 'Architecture & Design',
        children: [
          {
            key: 'arts.design.architecture',
            display: 'Architecture',
            searchQueries: ['architecture news', 'building design', 'urban architecture'],
            searchSites: ['archdaily.com', 'dezeen.com', 'architecturaldigest.com'],
          },
          {
            key: 'arts.design.product',
            display: 'Product Design',
            searchQueries: ['product design news', 'industrial design', 'design awards'],
            searchSites: ['dezeen.com', 'core77.com', 'itsnicethat.com'],
          },
        ],
      },
    ],
  },
  {
    key: 'sports',
    display: 'Sports',
    icon: '⚽',
    children: [
      {
        key: 'sports.team',
        display: 'Team Sports',
        children: [
          {
            key: 'sports.team.soccer',
            display: 'Soccer / Football',
            searchQueries: ['soccer football news', 'Premier League Champions League', 'FIFA'],
            searchSites: ['bbc.com/sport', 'espn.com', 'goal.com'],
          },
          {
            key: 'sports.team.americanfootball',
            display: 'American Football',
            searchQueries: ['NFL news', 'American football', 'Super Bowl NFL'],
            searchSites: ['nfl.com', 'espn.com', 'profootballtalk.nbcsports.com'],
          },
          {
            key: 'sports.team.basketball',
            display: 'Basketball',
            searchQueries: ['NBA news', 'basketball', 'NBA scores standings'],
            searchSites: ['nba.com', 'espn.com', 'bleacherreport.com'],
          },
          {
            key: 'sports.team.rugby',
            display: 'Rugby',
            searchQueries: ['rugby news', 'Six Nations Rugby World Cup', 'rugby union league'],
            searchSites: ['rugbypass.com', 'bbc.com/sport', 'skysports.com'],
          },
          {
            key: 'sports.team.baseball',
            display: 'Baseball',
            searchQueries: ['MLB news', 'baseball', 'World Series MLB'],
            searchSites: ['mlb.com', 'espn.com', 'baseballamerica.com'],
          },
        ],
      },
      {
        key: 'sports.individual',
        display: 'Individual Sports',
        children: [
          {
            key: 'sports.individual.tennis',
            display: 'Tennis',
            searchQueries: ['tennis news', 'Grand Slam ATP WTA', 'Wimbledon US Open'],
            searchSites: ['tennis.com', 'atptour.com', 'espn.com'],
          },
          {
            key: 'sports.individual.golf',
            display: 'Golf',
            searchQueries: ['golf news', 'PGA Tour Masters golf', 'golf tournament'],
            searchSites: ['golfchannel.com', 'golfweek.usatoday.com', 'espn.com'],
          },
          {
            key: 'sports.individual.combat',
            display: 'Combat Sports',
            searchQueries: ['MMA UFC boxing news', 'combat sports', 'fight results'],
            searchSites: ['mmafighting.com', 'boxing.com', 'espn.com'],
          },
          {
            key: 'sports.individual.athletics',
            display: 'Athletics',
            searchQueries: ['track and field athletics news', 'marathon running', 'sprint records'],
            searchSites: ['worldathletics.org', 'runnersworldcom', 'athleticsweekly.com'],
          },
        ],
      },
      {
        key: 'sports.motorsports',
        display: 'Motorsports',
        children: [
          {
            key: 'sports.motorsports.f1',
            display: 'Formula 1',
            searchQueries: ['Formula 1 news', 'F1 race results', 'Grand Prix F1'],
            searchSites: ['formula1.com', 'autosport.com', 'motorsport.com'],
          },
          {
            key: 'sports.motorsports.other',
            display: 'MotoGP & Others',
            searchQueries: ['MotoGP news', 'NASCAR IndyCar motorsport', 'motorcycle racing'],
            searchSites: ['motogp.com', 'motorsport.com', 'autosport.com'],
          },
        ],
      },
      {
        key: 'sports.olympics',
        display: 'Olympics',
        children: [
          {
            key: 'sports.olympics.summer',
            display: 'Summer Olympics',
            searchQueries: ['Summer Olympics news', 'Olympic Games', 'Olympic athletes'],
            searchSites: ['olympics.com', 'bbc.com/sport', 'espn.com'],
          },
          {
            key: 'sports.olympics.winter',
            display: 'Winter Olympics',
            searchQueries: ['Winter Olympics news', 'skiing skating hockey Olympics', 'Winter Games'],
            searchSites: ['olympics.com', 'bbc.com/sport', 'eurosport.com'],
          },
        ],
      },
    ],
  },
  {
    key: 'politics',
    display: 'Politics & Society',
    icon: '🌍',
    children: [
      {
        key: 'politics.world',
        display: 'World Politics',
        children: [
          {
            key: 'politics.world.us',
            display: 'US Politics',
            searchQueries: ['US politics news', 'Congress White House', 'American politics'],
            searchSites: ['politico.com', 'thehill.com', 'apnews.com'],
          },
          {
            key: 'politics.world.europe',
            display: 'European Politics',
            searchQueries: ['European politics news', 'EU European Union', 'European elections'],
            searchSites: ['politico.eu', 'euractiv.com', 'reuters.com'],
          },
          {
            key: 'politics.world.middleeast',
            display: 'Middle East',
            searchQueries: ['Middle East news', 'Israel Palestine Iran', 'Arab world politics'],
            searchSites: ['aljazeera.com', 'middleeasteye.net', 'reuters.com'],
          },
          {
            key: 'politics.world.asia',
            display: 'Asia-Pacific',
            searchQueries: ['Asia Pacific politics news', 'China India Japan', 'Southeast Asia'],
            searchSites: ['scmp.com', 'nikkei.com', 'thediplomat.com'],
          },
        ],
      },
      {
        key: 'politics.social',
        display: 'Social Issues',
        children: [
          {
            key: 'politics.social.civilrights',
            display: 'Civil Rights',
            searchQueries: ['civil rights news', 'human rights', 'equality social justice'],
            searchSites: ['aclu.org', 'hrw.org', 'theguardian.com'],
          },
          {
            key: 'politics.social.immigration',
            display: 'Immigration',
            searchQueries: ['immigration news', 'migrants asylum policy', 'border immigration'],
            searchSites: ['migrationpolicy.org', 'reuters.com', 'apnews.com'],
          },
          {
            key: 'politics.social.education',
            display: 'Education',
            searchQueries: ['education policy news', 'schools universities', 'education reform'],
            searchSites: ['edsurge.com', 'edweek.org', 'theatlantic.com'],
          },
        ],
      },
      {
        key: 'politics.law',
        display: 'Law & Justice',
        children: [
          {
            key: 'politics.law.courts',
            display: 'Courts & Judiciary',
            searchQueries: ['court rulings news', 'Supreme Court legal decisions', 'judiciary'],
            searchSites: ['scotusblog.com', 'lawfareblog.com', 'reuters.com'],
          },
          {
            key: 'politics.law.crime',
            display: 'Crime & Investigations',
            searchQueries: ['crime news', 'criminal investigation', 'white collar crime'],
            searchSites: ['propublica.org', 'reuters.com', 'apnews.com'],
          },
        ],
      },
    ],
  },
  {
    key: 'entertainment',
    display: 'Entertainment',
    icon: '🎮',
    children: [
      {
        key: 'entertainment.gaming',
        display: 'Gaming',
        children: [
          {
            key: 'entertainment.gaming.videogames',
            display: 'Video Games',
            searchQueries: ['video game news', 'game releases reviews', 'PlayStation Xbox Nintendo'],
            searchSites: ['ign.com', 'kotaku.com', 'gamespot.com'],
          },
          {
            key: 'entertainment.gaming.esports',
            display: 'eSports',
            searchQueries: ['esports news', 'competitive gaming tournaments', 'League of Legends CS2'],
            searchSites: ['esportsobserver.com', 'dotesports.com', 'thescore.gg'],
          },
          {
            key: 'entertainment.gaming.tabletop',
            display: 'Board & Tabletop Games',
            searchQueries: ['board game news', 'tabletop RPG', 'card games D&D'],
            searchSites: ['boardgamegeek.com', 'polygon.com', 'dicebreaker.com'],
          },
        ],
      },
      {
        key: 'entertainment.celebrity',
        display: 'Celebrity & Pop Culture',
        children: [
          {
            key: 'entertainment.celebrity.news',
            display: 'Celebrity News',
            searchQueries: ['celebrity news', 'Hollywood gossip', 'entertainment celebrities'],
            searchSites: ['people.com', 'tmz.com', 'eonline.com'],
          },
          {
            key: 'entertainment.celebrity.popculture',
            display: 'Pop Culture',
            searchQueries: ['pop culture news', 'trending culture memes', 'internet culture'],
            searchSites: ['buzzfeed.com', 'vulture.com', 'polygon.com'],
          },
        ],
      },
      {
        key: 'entertainment.food',
        display: 'Food & Drink',
        children: [
          {
            key: 'entertainment.food.restaurants',
            display: 'Restaurants & Dining',
            searchQueries: ['restaurant news', 'dining food trends', 'chef restaurant openings'],
            searchSites: ['eater.com', 'bonappetit.com', 'foodandwine.com'],
          },
          {
            key: 'entertainment.food.drink',
            display: 'Wine, Beer & Spirits',
            searchQueries: ['wine news', 'craft beer spirits', 'cocktails beverage trends'],
            searchSites: ['winespectator.com', 'craftbeer.com', 'diffordsguide.com'],
          },
        ],
      },
      {
        key: 'entertainment.travel',
        display: 'Travel',
        children: [
          {
            key: 'entertainment.travel.destinations',
            display: 'Destinations',
            searchQueries: ['travel destinations news', 'vacation travel tips', 'best places to visit'],
            searchSites: ['lonelyplanet.com', 'cntraveler.com', 'travelandleisure.com'],
          },
          {
            key: 'entertainment.travel.aviation',
            display: 'Aviation & Airlines',
            searchQueries: ['airline aviation news', 'flight travel industry', 'airports'],
            searchSites: ['thepointsguy.com', 'aviationweek.com', 'airlineroute.net'],
          },
        ],
      },
      {
        key: 'entertainment.fashion',
        display: 'Fashion & Beauty',
        children: [
          {
            key: 'entertainment.fashion.fashion',
            display: 'Fashion',
            searchQueries: ['fashion news', 'runway designer collections', 'style trends'],
            searchSites: ['vogue.com', 'wwd.com', 'businessoffashion.com'],
          },
          {
            key: 'entertainment.fashion.beauty',
            display: 'Beauty',
            searchQueries: ['beauty news', 'skincare makeup trends', 'beauty industry'],
            searchSites: ['allure.com', 'beautymatter.com', 'refinery29.com'],
          },
        ],
      },
    ],
  },
];

export function findLeaf(key: string): LeafTopic | undefined {
  for (const top of TAXONOMY) {
    for (const sub of top.children) {
      for (const leaf of sub.children) {
        if (leaf.key === key) return leaf;
      }
    }
  }
  return undefined;
}

export function getAllLeaves(): LeafTopic[] {
  const leaves: LeafTopic[] = [];
  for (const top of TAXONOMY) {
    for (const sub of top.children) {
      for (const leaf of sub.children) {
        leaves.push(leaf);
      }
    }
  }
  return leaves;
}
