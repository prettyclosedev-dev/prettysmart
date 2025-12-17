const path = require("path");
const fs = require("fs");
const {
  getCategories,
  getDesigns,
  getBrandedDesign,
} = require("./clyps_api");

async function generateAndStoreTemplates(req, opts = {}, logger = (msg) => console.log(msg)) {
  const userId = req.user && (req.user._id || req.user.id);
  if (!userId) throw new Error("Missing user");
  logger(`[TemplatesCache] START user=${userId}`);

  // Fetch categories available on Templates page
  logger(`[TemplatesCache] Fetching categories (availableOnPages contains 'Templates')...`);
  const categories = await getCategories({
    where: { availableOnPages: { has: "Templates" } },
    orderBy: [{ priority: { sort: "asc" } }],
  });
  logger(`[TemplatesCache] Retrieved ${categories.length} categories`);

  // Sub-categories (orientations)
  const orientations = ["square", "vertical", "horizontal"];
  logger(`[TemplatesCache] Using orientations: ${orientations.join(", ")}`);

  // Base output dir
  const baseOutDir = path.join(__dirname, "site_static/templates", String(userId));
  // Always start with a clean slate: remove existing folder if present for faster overwrite
  if (fs.existsSync(baseOutDir)) {
    logger(`[TemplatesCache] Removing existing base directory ${baseOutDir}`);
    try {
      fs.rmSync(baseOutDir, { recursive: true, force: true });
    } catch (e) {
      logger(`[TemplatesCache] Failed to remove existing directory: ${e.message || e}`);
    }
  }
  fs.mkdirSync(baseOutDir, { recursive: true });
  logger(`[TemplatesCache] Created fresh base directory ${baseOutDir}`);

  let processed = 0;
  let saved = 0;
  let errors = 0;

  const pageSize = opts.pageSize || 10;
  logger(`[TemplatesCache] Page size per orientation/category set to ${pageSize}`);

  // 1. Gather all designs to be generated
  const fetchDesignsForCatOrient = async (cat, orient) => {
    const safeCat = (cat.name || `cat-${cat.id}`).replace(/[^a-z0-9\-\s_]/gi, "").trim().replace(/\s+/g, "-");
    const safeOrient = orient.replace(/[^a-z0-9\-\s_]/gi, "").trim().replace(/\s+/g, "-");
    const outDir = path.join(baseOutDir, safeCat, safeOrient);

    const designsData = await getDesigns({
      take: pageSize,
      skip: 0,
      where: {
        AND: [
          { categories: { some: { id: { equals: parseInt(cat.id) } } } },
          { categories: { some: { name: { contains: orient, mode: "insensitive" } } } },
        ],
      },
    });

    let designs = (designsData && designsData.designs) || [];
    // Filter out duplicates
    designs = designs.filter(d => !d.tags || !d.tags.some(t => t.startsWith("original_id:")));

    return designs.map(d => ({ d, cat, orient, outDir, safeCat, safeOrient }));
  };

  logger(`[TemplatesCache] Fetching design lists for all categories/orientations...`);
  const fetchPromises = [];
  for (const cat of categories) {
    for (const orient of orientations) {
      fetchPromises.push(fetchDesignsForCatOrient(cat, orient));
    }
  }

  const results = await Promise.all(fetchPromises);
  const flatTasks = results.flat();
  logger(`[TemplatesCache] Total designs to generate: ${flatTasks.length}`);

  // 2. Process generation with concurrency limit
  const CONCURRENCY_LIMIT = 15; // Aggressive parallelism
  
  async function processTask(task) {
    const { d, cat, orient, outDir, safeCat, safeOrient } = task;
    processed++;
    
    try {
      const variables = {
        user: req.user,
        where: { id: parseInt(d.id) },
        previewOptions: { mimeType: "image/jpeg", pixelRatio: 0.5 }, // Low res for speed
        brandWhere: { prettySmartId: req.user.account._id.toString() },
      };

      const branded = await getBrandedDesign(variables);
      const b64 = branded && branded.brandedDesign && branded.brandedDesign.preview;
      
      if (!b64) {
        errors++;
        return;
      }
      
      const buf = Buffer.from(b64, "base64");
      const safeDesignName = (d.name || `design-${parseInt(d.id)}`)
        .replace(/[^a-z0-9\-\s_]/gi, "")
        .trim()
        .replace(/\s+/g, "-");
      const fileName = `${parseInt(d.id)}_${safeDesignName}.jpg`;
      
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const fullPath = path.join(outDir, fileName);
      fs.writeFileSync(fullPath, buf);
      saved++;

      // Log success for frontend update
      logger(JSON.stringify({
        type: 'template_generated',
        category: safeCat,
        orientation: orient,
        templateId: d.id,
        templateName: d.name,
        imageUrl: `/site_static/templates/${userId}/${safeCat}/${safeOrient}/${fileName}`
      }));
    } catch (e) {
      errors++;
      logger(`[TemplatesCache] ERROR ${d.id}: ${e.message}`);
    }
  }

  const executing = new Set();
  for (const task of flatTasks) {
    const p = processTask(task).then(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= CONCURRENCY_LIMIT) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);

  // Write status file to indicate completion
  try {
    fs.writeFileSync(path.join(baseOutDir, "status.json"), JSON.stringify({ 
      status: "complete", 
      timestamp: Date.now(),
      count: saved 
    }));
  } catch (e) {
    logger(`[TemplatesCache] Failed to write status file: ${e.message}`);
  }

  logger(`[TemplatesCache] DONE. Processed: ${processed}, Saved: ${saved}, Errors: ${errors}`);
  logger("[TemplatesCache] STREAM_DONE");
  
  return { processed, saved, errors };
}

module.exports = { generateAndStoreTemplates };
