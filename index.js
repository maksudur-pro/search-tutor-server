require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lb3rxqj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("searchTeacherDb"); // Use your DB name
    const usersCollection = db.collection("users");
    const tuitionRequestsCollection = db.collection("tuitionRequests");
    const jobsCollection = db.collection("jobs");
    const applicationsCollection = db.collection("applications");

    // GET route to fetch all users
    app.get("/users", verifyToken, async (req, res) => {
      try {
        const allUsers = await usersCollection.find().toArray();
        res.send(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    // Save a new user
    app.post("/users", async (req, res) => {
      try {
        const {
          uid,
          name,
          gender,
          phone,
          email,
          city,
          location,
          accountType,
          image,
        } = req.body;

        if (!uid || !email) {
          return res.status(400).send({ error: "UID and email are required" });
        }

        const existingUser = await usersCollection.findOne({ uid });
        if (existingUser) {
          return res.status(400).send({ error: "User already exists" });
        }

        const newUser = {
          uid,
          name,
          gender,
          phone,
          email,
          city,
          location,
          accountType,
          image,
        };
        await usersCollection.insertOne(newUser);
        res.status(201).send(newUser);
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ error: "Failed to save user" });
      }
    });
    // Save a update user
    app.patch("/users/:uid", verifyToken, async (req, res) => {
      try {
        const uid = req.params.uid;
        const updateData = req.body;

        // Only allow specific fields to update:
        const allowedFields = [
          "name",
          "phone",
          "gender",
          "city",
          "location",
          "fbLink",
          "institute",
          "idNo",
          "department",
          "degree",
          "passingYear",
          "image",
          "nid",
          "idCard",
        ];

        // Filter updateData
        const filteredData = {};
        for (const key of allowedFields) {
          if (updateData[key] !== undefined) {
            filteredData[key] = updateData[key];
          }
        }

        const result = await usersCollection.updateOne(
          { uid },
          { $set: filteredData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        // Return updated user info
        const updatedUser = await usersCollection.findOne({ uid });

        res.send(updatedUser);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ error: "Failed to update user" });
      }
    });

    // Get a user by uid
    app.get("/users/:uid", verifyToken, async (req, res) => {
      try {
        const uid = req.params.uid;
        const user = await usersCollection.findOne({ uid });

        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ error: "Failed to fetch user" });
      }
    });

    // PATCH route to update user's accountType
    app.patch("/users/:uid/accountType", verifyToken, async (req, res) => {
      try {
        const uid = req.params.uid;
        const { accountType } = req.body;

        if (!accountType) {
          return res.status(400).send({ error: "Missing accountType" });
        }

        const result = await usersCollection.updateOne(
          { uid },
          { $set: { accountType } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send({ message: `User updated to ${accountType}` });
      } catch (error) {
        console.error("Error updating accountType:", error);
        res.status(500).send({ error: "Failed to update accountType" });
      }
    });

    // PATCH route to verify user
    app.patch("/users/:uid/verify", verifyToken, async (req, res) => {
      try {
        const uid = req.params.uid;
        const { isVerified } = req.body;

        if (typeof isVerified !== "boolean") {
          return res
            .status(400)
            .send({ error: "Missing or invalid isVerified value" });
        }

        const result = await usersCollection.updateOne(
          { uid },
          { $set: { isVerified } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send({ message: `User verification updated to ${isVerified}` });
      } catch (error) {
        console.error("Error updating isVerified:", error);
        res.status(500).send({ error: "Failed to update isVerified" });
      }
    });

    // Delete user by uid
    app.delete("/users/:uid", verifyToken, async (req, res) => {
      try {
        const uid = req.params.uid;
        const result = await usersCollection.deleteOne({ uid });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    // tuition Requests

    app.post("/tuition-requests", async (req, res) => {
      try {
        const requestData = req.body;

        // Define only required fields
        const requiredFields = [
          "phoneNumber",
          "city",
          "location",
          "class",
          "subjects",
          "category",
          "tuitionType",
          "studentGender",
          "tutorGenderPreference",
          "salary",
          "daysPerWeek",
        ];

        const missing = requiredFields.filter((field) => !requestData[field]);
        if (missing.length > 0) {
          return res
            .status(400)
            .send({ error: `Missing required fields: ${missing.join(", ")}` });
        }

        // Optional field (no need to check)
        // requestData.additionalRequirements is optional

        const result = await tuitionRequestsCollection.insertOne(requestData);
        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
          message: "Tuition request saved successfully",
        });
      } catch (error) {
        console.error("Error saving tuition request:", error);
        res.status(500).send({ error: "Failed to save tuition request" });
      }
    });

    // tuition get

    app.get("/tuition-requests", verifyToken, async (req, res) => {
      try {
        const allRequests = await tuitionRequestsCollection
          .find()
          .sort({ _id: -1 })
          .toArray();

        res.send(allRequests);
      } catch (error) {
        console.error("Error fetching tuition requests:", error);
        res.status(500).send({ error: "Failed to fetch tuition requests" });
      }
    });

    app.patch(
      "/tuition-requests/:id/call-status",
      verifyToken,
      async (req, res) => {
        const { id } = req.params;
        const { isCalled } = req.body;

        try {
          const result = await tuitionRequestsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isCalled } }
          );

          if (result.modifiedCount === 1) {
            res.send({ success: true });
          } else {
            res.send({ success: false });
          }
        } catch (error) {
          console.error("Error updating call status:", error);
          res.status(500).send({ error: "Failed to update call status" });
        }
      }
    );

    // job-requests

    app.post("/job-requests", async (req, res) => {
      try {
        const {
          jobTitle,
          tuitionType,
          category,
          studentGender,
          city,
          location,
          class: classLevel,
          subjects,
          daysPerWeek,
          tutorGenderPreference,
          salary,
          studentsNumber,
          tutoringTime,
        } = req.body;

        const requiredFields = [
          "jobTitle",
          "tuitionType",
          "category",
          "studentGender",
          "city",
          "location",
          "class",
          "subjects",
          "daysPerWeek",
          "tutorGenderPreference",
          "salary",
          "studentsNumber",
          "tutoringTime",
        ];

        const missing = requiredFields.filter((field) => !req.body[field]);
        if (missing.length > 0) {
          return res.status(400).send({
            success: false,
            message: `Missing required fields: ${missing.join(", ")}`,
          });
        }

        // ✅ Auto-incrementing jobId
        const lastJob = await jobsCollection
          .find()
          .sort({ jobId: -1 })
          .limit(1)
          .toArray();
        const jobId =
          lastJob.length > 0 && lastJob[0].jobId ? lastJob[0].jobId + 1 : 50000;

        const dateObj = new Date();
        const postedDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });

        const subjectsArray = Array.isArray(subjects)
          ? subjects
          : subjects.split(",").map((s) => s.trim());

        const newJob = {
          jobId,
          title: jobTitle,
          type: tuitionType,
          category,
          studentGender,
          classLevel,
          subjects: subjectsArray,
          daysPerWeek,
          tutorGenderPreference,
          salary: Number(salary),
          studentsNumber: Number(studentsNumber),
          tutoringTime,
          location: `${location}, ${city}`,
          city,
          date: postedDate,
          dateObj,
        };

        const result = await jobsCollection.insertOne(newJob);

        res.status(201).send({
          success: true,
          message: "Tuition job posted successfully",
          insertedId: result.insertedId,
          jobId: jobId,
        });
      } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).send({
          success: false,
          message: "Failed to post tuition job",
        });
      }
    });

    // GET all job posts
    app.get("/jobs", async (req, res) => {
      try {
        const jobs = await jobsCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send({
          success: true,
          data: jobs,
        });
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch jobs",
        });
      }
    });

    // GET a single job post by ID
    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const job = await jobsCollection.findOne({ _id: new ObjectId(id) });

        if (!job) {
          return res.status(404).send({
            success: false,
            message: "Job not found",
          });
        }

        res.status(200).send({
          success: true,
          data: job,
        });
      } catch (error) {
        console.error("Error fetching job by ID:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch job",
        });
      }
    });

    // POST: Apply to a job

    app.post("/applications", verifyToken, async (req, res) => {
      const { jobId, userId, userEmail } = req.body;

      if (!jobId || !userId || !userEmail) {
        return res
          .status(400)
          .send({ error: "Missing jobId, userId or userEmail" });
      }

      const existing = await applicationsCollection.findOne({ jobId, userId });

      if (existing) {
        return res.status(400).send({ error: "Already applied" });
      }

      const result = await applicationsCollection.insertOne({
        jobId,
        userId,
        userEmail,
        appliedAt: new Date(),
        status: "pending",
      });

      res.send({ success: true, insertedId: result.insertedId });
    });

    // GET: Check if a user has applied for a job
    app.get("/applications/check", verifyToken, async (req, res) => {
      const { jobId, userId } = req.query;

      if (!jobId || !userId) {
        return res.status(400).send({ error: "Missing jobId or userId" });
      }

      const applied = await applicationsCollection.findOne({ jobId, userId });

      res.send({ hasApplied: !!applied });
    });

    // Get applications by userId

    app.get("/applications/user/:userId", verifyToken, async (req, res) => {
      try {
        const userId = req.params.userId;

        const appliedJobsWithStatus = await applicationsCollection
          .aggregate([
            {
              $match: { userId: userId },
            },
            {
              $addFields: {
                jobIdObj: { $toObjectId: "$jobId" }, // convert string to ObjectId
              },
            },
            {
              $lookup: {
                from: "jobs",
                localField: "jobIdObj",
                foreignField: "_id",
                as: "jobDetails",
              },
            },
            {
              $unwind: "$jobDetails",
            },
            // Instead of replaceRoot, project a combined object
            {
              $project: {
                _id: 1,
                status: 1,
                appliedAt: 1,
                job: "$jobDetails",
              },
            },
          ])
          .toArray();

        res.json(appliedJobsWithStatus);
      } catch (error) {
        console.error("Error fetching applied jobs:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // PATCH: Admin updates application status
    app.patch("/applications/:id/status", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "reviewed", "selected", "rejected"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid or missing status" });
      }

      try {
        const result = await applicationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Application not found" });
        }

        res.json({ success: true, message: `Status updated to \"${status}\"` });
      } catch (error) {
        console.error("Error updating application status:", error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // GET: Get all applications with user and job info for admin
    app.get("/applications", verifyToken, async (req, res) => {
      try {
        const allApplications = await applicationsCollection
          .aggregate([
            {
              $addFields: {
                jobIdObj: { $toObjectId: "$jobId" },
              },
            },
            {
              $lookup: {
                from: "jobs",
                localField: "jobIdObj",
                foreignField: "_id",
                as: "jobDetails",
              },
            },
            { $unwind: "$jobDetails" },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "uid",
                as: "userDetails",
              },
            },
            { $unwind: "$userDetails" },
            { $sort: { _id: -1 } },
          ])
          .toArray();

        res.json(allApplications);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // PATCH: Update payment status
    app.patch("/applications/:id/payment", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      const validStatuses = ["unpaid", "paid", "pending"];
      if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
        return res
          .status(400)
          .json({ error: "Invalid or missing paymentStatus" });
      }

      try {
        const result = await applicationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { paymentStatus } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Application not found" });
        }

        res.json({
          success: true,
          message: `Payment status updated to "${paymentStatus}"`,
        });
      } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).json({ error: "Server error" });
      }
    });

    app.post("/jwt", (req, res) => {
      const user = req.body;

      if (!user || !user.uid || !user.email) {
        return res
          .status(400)
          .send({ success: false, error: "UID and email are required" });
      }

      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      // cookie set করো না, শুধু token response দাও
      res.send({ success: true, token });
    });

    function verifyToken(req, res, next) {
      // Authorization header থেকে token নাও
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Unauthorized: No token provided" });
      }

      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Invalid token" });
        req.user = decoded;
        next();
      });
    }

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("search teacher is live");
});

app.listen(port, () => {
  console.log(`search teacher is sitting on port ${port}`);
});
